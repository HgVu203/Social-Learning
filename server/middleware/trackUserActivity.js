import UserActivity from '../models/user_activity.model.js';

const trackUserActivity = async (req, res, next) => {
    try {
        const originalSend = res.json;
        res.json = function (data) {
            // Chỉ track các hoạt động thành công
            if (res.statusCode === 200 || res.statusCode === 201) {
                const userId = req.user?._id;
                if (userId) {
                    let activityType;
                    let postId;

                    // Xác định loại hoạt động dựa trên route và method
                    if (req.method === 'POST' && req.path.endsWith('/posts')) {
                        activityType = 'create_post';
                        postId = data.data?._id;
                    } else if (req.method === 'POST' && req.path.includes('/comment')) {
                        activityType = 'comment';
                        postId = req.params.id;
                    } else if (req.method === 'POST' && req.path.includes('/like')) {
                        activityType = 'like';
                        postId = req.params.id;
                    } else if (req.method === 'GET' && req.path.match(/\/posts\/[^/]+$/)) {
                        activityType = 'view';
                        postId = req.params.id;
                    } else if (req.method === 'GET' && req.path.includes('/search')) {
                        activityType = 'search';
                        // Có thể lưu từ khóa tìm kiếm
                        postId = null;
                    }

                    if (activityType) {
                        new UserActivity({
                            userId,
                            postId,
                            type: activityType
                        }).save();
                    }
                }
            }
            originalSend.call(this, data);
        };
        next();
    } catch (error) {
        console.error('Error tracking user activity:', error);
        next();
    }
};

export default trackUserActivity;