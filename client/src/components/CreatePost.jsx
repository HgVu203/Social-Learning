import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { createPost } from '../services/postService';

const CreatePost = () => {
    const formik = useFormik({
        initialValues: {
            title: '',
            content: '',
            tags: ''
        },
        validationSchema: Yup.object({
            title: Yup.string().required('Title is required'),
            content: Yup.string().required('Content is required'),
            tags: Yup.string()
        }),
        onSubmit: async (values) => {
            try {
                const response = await createPost(values);
                alert('Post created successfully');
                window.location.href = '/';
            } catch (error) {
                alert(error.response.data.error);
            }
        }
    });

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <form onSubmit={formik.handleSubmit} className="bg-white p-6 rounded shadow-md w-full max-w-sm">
                <h2 className="text-2xl font-bold mb-4">Create Post</h2>
                <input
                    type="text"
                    name="title"
                    placeholder="Title"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.title}
                    className="w-full p-2 mb-4 border rounded"
                />
                {formik.touched.title && formik.errors.title ? (
                    <div className="text-red-500">{formik.errors.title}</div>
                ) : null}
                <textarea
                    name="content"
                    placeholder="Content"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.content}
                    className="w-full p-2 mb-4 border rounded"
                />
                {formik.touched.content && formik.errors.content ? (
                    <div className="text-red-500">{formik.errors.content}</div>
                ) : null}
                <input
                    type="text"
                    name="tags"
                    placeholder="Tags (comma separated)"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.tags}
                    className="w-full p-2 mb-4 border rounded"
                />
                <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">Create Post</button>
            </form>
        </div>
    );
};

export default CreatePost;