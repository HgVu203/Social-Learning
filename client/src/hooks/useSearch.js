import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const useSearch = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (searchQuery) => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return {
    query,
    setQuery,
    handleSearch
  };
};