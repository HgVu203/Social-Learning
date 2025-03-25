import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { createGroup } from '../../redux/groupSlice';
import { FiImage, FiUpload, FiX } from 'react-icons/fi';

const CreateGroupPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.group);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPrivate: false,
    avatarImage: null,
    coverImage: null
  });
  
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleImageChange = (e, imageType) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Update form data
    setFormData({
      ...formData,
      [imageType]: file
    });
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (imageType === 'avatarImage') {
        setAvatarPreview(reader.result);
      } else {
        setCoverPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };
  
  const removeImage = (imageType) => {
    setFormData({
      ...formData,
      [imageType]: null
    });
    
    if (imageType === 'avatarImage') {
      setAvatarPreview(null);
    } else {
      setCoverPreview(null);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Create form data object for file upload
    const groupFormData = new FormData();
    groupFormData.append('name', formData.name);
    groupFormData.append('description', formData.description);
    groupFormData.append('isPrivate', formData.isPrivate);
    
    if (formData.avatarImage) {
      groupFormData.append('avatarImage', formData.avatarImage);
    }
    
    if (formData.coverImage) {
      groupFormData.append('coverImage', formData.coverImage);
    }
    
    try {
      const response = await dispatch(createGroup(groupFormData)).unwrap();
      navigate(`/groups/${response._id}`);
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Create New Group</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 p-4 rounded-md text-red-600 text-sm">
            {error}
          </div>
        )}
        
        {/* Cover Image Upload */}
        <div className="relative">
          <div 
            className={`h-48 rounded-lg flex items-center justify-center ${
              coverPreview ? 'bg-gray-200' : 'bg-gray-100 border-2 border-dashed border-gray-300'
            }`}
            style={coverPreview ? { backgroundImage: `url(${coverPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
          >
            {!coverPreview && (
              <div className="text-center">
                <FiImage className="mx-auto text-gray-400 text-3xl mb-2" />
                <p className="text-gray-500">Cover Image (Optional)</p>
                <p className="text-xs text-gray-400 mt-1">Recommended size: 820 x 312 pixels</p>
              </div>
            )}
            
            {coverPreview && (
              <button 
                type="button" 
                onClick={() => removeImage('coverImage')}
                className="absolute top-2 right-2 bg-gray-800 bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-70"
              >
                <FiX />
              </button>
            )}
          </div>
          
          <input
            type="file"
            id="coverImage"
            onChange={(e) => handleImageChange(e, 'coverImage')}
            accept="image/*"
            className="hidden"
          />
          
          <label 
            htmlFor="coverImage" 
            className="absolute bottom-2 right-2 bg-white rounded-md shadow-md px-3 py-1.5 text-sm font-medium flex items-center cursor-pointer"
          >
            <FiUpload className="mr-1" /> {coverPreview ? 'Change Cover' : 'Add Cover'}
          </label>
        </div>
        
        {/* Avatar Upload */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div 
              className={`w-24 h-24 rounded-full flex items-center justify-center ${
                avatarPreview ? 'bg-gray-200' : 'bg-gray-100 border-2 border-dashed border-gray-300'
              }`}
              style={avatarPreview ? { backgroundImage: `url(${avatarPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
            >
              {!avatarPreview && <FiImage className="text-gray-400 text-xl" />}
              
              {avatarPreview && (
                <button 
                  type="button" 
                  onClick={() => removeImage('avatarImage')}
                  className="absolute -top-1 -right-1 bg-gray-800 bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-70"
                  style={{ fontSize: '10px' }}
                >
                  <FiX size={12} />
                </button>
              )}
            </div>
            
            <input
              type="file"
              id="avatarImage"
              onChange={(e) => handleImageChange(e, 'avatarImage')}
              accept="image/*"
              className="hidden"
            />
            
            <label 
              htmlFor="avatarImage" 
              className="absolute bottom-0 right-0 bg-white rounded-full shadow-md p-1.5 text-xs font-medium cursor-pointer"
            >
              <FiUpload size={14} />
            </label>
          </div>
          
          <div>
            <h3 className="font-medium">Group Profile Image</h3>
            <p className="text-xs text-gray-500">Upload a profile image for your group</p>
          </div>
        </div>
        
        {/* Group Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Group Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* Group Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Group Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="What is this group about?"
          ></textarea>
        </div>
        
        {/* Privacy Settings */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Privacy Type
          </label>
          
          <div className="space-y-2">
            <label className="flex items-start p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="isPrivate"
                checked={!formData.isPrivate}
                onChange={() => setFormData({ ...formData, isPrivate: false })}
                className="mt-0.5 mr-3"
              />
              <div>
                <span className="font-medium">Public Group</span>
                <p className="text-sm text-gray-500 mt-1">
                  Anyone can see the group, its members and their posts
                </p>
              </div>
            </label>
            
            <label className="flex items-start p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="isPrivate"
                checked={formData.isPrivate}
                onChange={() => setFormData({ ...formData, isPrivate: true })}
                className="mt-0.5 mr-3"
              />
              <div>
                <span className="font-medium">Private Group</span>
                <p className="text-sm text-gray-500 mt-1">
                  Only members can see the group, its members and their posts
                </p>
              </div>
            </label>
          </div>
        </div>
        
        {/* Submit Button */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/groups')}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateGroupPage; 