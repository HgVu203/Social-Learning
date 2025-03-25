import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { searchPosts } from '../../redux/postSlice';
import MainLayout from '../../layout/MainLayout';
import PostList from '../../components/post/PostList';
import Loading from '../../components/common/Loading';

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  const dispatch = useDispatch();
  const { searchResults, searchLoading, searchError } = useSelector(state => state.posts);

  useEffect(() => {
    if (query) {
      dispatch(searchPosts(query));
    }
  }, [query, dispatch]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">
          Kết quả tìm kiếm cho {query}
        </h1>
        
        {searchLoading ? (
          <Loading />
        ) : searchError ? (
          <div className="text-red-500 text-center py-4">{searchError}</div>
        ) : searchResults.length > 0 ? (
          <PostList posts={searchResults} />
        ) : (
          <div className="text-center py-8 text-gray-500">
            Không tìm thấy kết quả nào cho {query}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default SearchPage;