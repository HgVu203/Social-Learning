import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { addComment, deleteComment, fetchComments } from '../../redux/postSlice';
import Avatar from '../common/Avatar';
import { formatDistanceToNow } from 'date-fns';

const CommentForm = ({ postId, replyToId = null, onCommentAdded, onCancel = null }) => {
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);

  // Focus input when mounted (useful for reply forms)
  useEffect(() => {
    if (replyToId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyToId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || !user) return;

    // Optimistic update with local data
    const tempComment = {
      _id: `temp-${Date.now()}`,
      content: content.trim(),
      userId: {
        _id: user._id,
        username: user.username,
        fullname: user.fullname,
        avatar: user.avatar
      },
      parentId: replyToId,
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };

    // Add to UI immediately
    if (onCommentAdded) {
      onCommentAdded(tempComment);
    }

    // Clear input
    setContent('');
    
    // Then send to server
    try {
      await dispatch(addComment({ 
        postId, 
        content: content.trim(),
        parentId: replyToId
      }));
    } catch (error) {
      console.error('Failed to add comment:', error);
      // You could handle the error by removing the optimistic comment here
    }
    
    // Cancel reply mode if applicable
    if (onCancel) onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className={`flex gap-2 ${replyToId ? 'ml-8 mt-2' : ''}`}>
      <Avatar 
        src={user?.avatar} 
        alt={user?.username} 
        className="w-8 h-8 shrink-0" 
      />
      <div className={`relative flex-1 rounded-full overflow-hidden ${isFocused ? 'ring-2 ring-blue-400' : ''}`}>
        <input
          ref={inputRef}
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={replyToId ? "Write a reply..." : "Write a comment..."}
          className="w-full bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none"
        />
        {content.trim() && (
          <button 
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-500 hover:text-blue-600"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
            </svg>
          </button>
        )}
      </div>
      {replyToId && onCancel && (
        <button 
          type="button" 
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      )}
    </form>
  );
};

const Comment = ({ postId, comment, onDelete, depth = 0 }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [localReplies, setLocalReplies] = useState(comment.replies || []);
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const isAuthor = user?._id === comment.userId?._id;
  const maxDepth = 2; // Maximum nesting level

  // Handle case when user data is missing
  const userAvatar = comment.userId?.avatar || '/images/default-avatar.png';
  const userName = comment.userId?.fullname || comment.userId?.username || 'Unknown User';
  const userId = comment.userId?._id || 'unknown';

  // Update local replies when comment prop changes
  useEffect(() => {
    if (comment.replies?.length) {
      setLocalReplies(comment.replies);
    }
  }, [comment.replies]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      await dispatch(deleteComment({ postId, commentId: comment._id }));
      if (onDelete) onDelete(comment._id);
    }
  };

  const handleReplyAdded = (newReply) => {
    setLocalReplies([newReply, ...localReplies]);
  };

  const handleReplyDeleted = (replyId) => {
    setLocalReplies(localReplies.filter(reply => reply._id !== replyId));
  };

  // For debugging purposes
  useEffect(() => {
    if (!comment.userId || (!comment.userId.fullname && !comment.userId.username)) {
      console.warn('Comment with missing user data:', comment);
    }
  }, [comment]);

  return (
    <div className="comment-thread">
      <div className="flex gap-2">
        <Link to={`/profile/${userId}`}>
          <Avatar 
            src={userAvatar} 
            alt={userName} 
            className="w-8 h-8 shrink-0" 
          />
        </Link>
        <div className="flex-1">
          <div className="bg-gray-100 rounded-2xl px-4 py-2 inline-block">
            <Link 
              to={`/profile/${userId}`}
              className="font-medium hover:underline"
            >
              {userName}
            </Link>
            <p className="text-gray-800">{comment.content}</p>
          </div>
          
          <div className="flex items-center mt-1 ml-2 text-xs gap-3">
            <span className="text-gray-500">
              {comment.isOptimistic ? 'Just now' : formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            
            {!comment.isOptimistic && user && depth < maxDepth && (
              <button 
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="font-medium text-gray-600 hover:text-gray-800"
              >
                Reply
              </button>
            )}
            
            {isAuthor && (
              <button
                onClick={handleDelete}
                className="text-gray-600 hover:text-red-600"
              >
                Delete
              </button>
            )}
          </div>
          
          {showReplyForm && (
            <CommentForm 
              postId={postId} 
              replyToId={comment._id}
              onCommentAdded={handleReplyAdded}
              onCancel={() => setShowReplyForm(false)}
            />
          )}
          
          {/* Display replies */}
          {localReplies.length > 0 && (
            <div className="mt-2 ml-6">
              {localReplies.map(reply => (
                <Comment 
                  key={reply._id}
                  postId={postId}
                  comment={reply}
                  onDelete={handleReplyDeleted}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PostComments = ({ postId }) => {
  const [localComments, setLocalComments] = useState([]);
  const [showAllComments, setShowAllComments] = useState(false);
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { posts, commentsLoading } = useSelector(state => state.post);
  const post = posts.find(p => p._id === postId);
  
  // Initialize and sync local comments with Redux state
  useEffect(() => {
    if (post?.comments) {
      // Group comments by parent to create a tree structure
      const commentsByParent = {};
      const topLevelComments = [];
      
      // First pass: organize all comments
      post.comments.forEach(comment => {
        // Initialize replies array for this comment
        if (!commentsByParent[comment._id]) {
          commentsByParent[comment._id] = [];
        }
        
        if (!comment.parentId) {
          // This is a top-level comment
          topLevelComments.push({
            ...comment,
            replies: commentsByParent[comment._id] || []
          });
        } else {
          // This is a reply, add it to its parent's replies
          if (!commentsByParent[comment.parentId]) {
            commentsByParent[comment.parentId] = [];
          }
          commentsByParent[comment.parentId].push(comment);
        }
      });
      
      // Sort top-level comments by creation time (newest first)
      const sortedComments = topLevelComments.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      setLocalComments(sortedComments);
    } else {
      setLocalComments([]);
    }
  }, [post?.comments]);

  useEffect(() => {
    if (postId) {
      dispatch(fetchComments(postId));
    }
  }, [dispatch, postId]);

  const handleCommentAdded = (newComment) => {
    // Only add to local comments if it's a top-level comment
    if (!newComment.parentId) {
      const updatedComments = [
        { ...newComment, replies: [] },
        ...localComments
      ];
      setLocalComments(updatedComments);
    }
  };

  const handleCommentDeleted = (commentId) => {
    setLocalComments(localComments.filter(c => c._id !== commentId));
  };
  
  // Determine how many comments to display
  const displayComments = showAllComments ? localComments : localComments.slice(0, 3);
  const hasMoreComments = localComments.length > 3 && !showAllComments;

  return (
    <div className="space-y-4">
      {/* Comment Form */}
      {user && <CommentForm postId={postId} onCommentAdded={handleCommentAdded} />}

      {/* Comments List */}
      <div className="space-y-4">
        {displayComments.map((comment) => (
          <Comment 
            key={comment._id}
            postId={postId} 
            comment={comment}
            onDelete={handleCommentDeleted}
          />
        ))}
      </div>

      {/* View more/less comments */}
      {hasMoreComments && (
        <button 
          onClick={() => setShowAllComments(true)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View {localComments.length - 3} more comments
        </button>
      )}
      
      {showAllComments && localComments.length > 3 && (
        <button 
          onClick={() => setShowAllComments(false)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View fewer comments
        </button>
      )}

      {/* Loading State */}
      {commentsLoading && !localComments.length && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      )}

      {/* No Comments */}
      {!commentsLoading && !localComments.length && (
        <p className="text-center text-gray-500 py-2">No comments yet. Be the first to comment!</p>
      )}
    </div>
  );
};

export default PostComments; 