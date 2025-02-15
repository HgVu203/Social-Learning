import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { signup } from '../services/authService';

const Signup = () => {
    const formik = useFormik({
        initialValues: {
            email: '',
            password: '',
            username: '',
            fullname: ''
        },
        validationSchema: Yup.object({
            email: Yup.string().email('Email không hợp lệ').required('Email là bắt buộc'),
            password: Yup.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').required('Mật khẩu là bắt buộc'),
            username: Yup.string().min(6, 'Tên người dùng phải có ít nhất 6 ký tự').required('Tên người dùng là bắt buộc'),
            fullname: Yup.string().min(6, 'Họ và tên phải có ít nhất 6 ký tự').required('Họ và tên là bắt buộc')
        }),
        onSubmit: async (values) => {
            try {
                const response = await signup(values);
                alert(response.data.data.message);
            } catch (error) {
                alert(error.response.data.error);
            }
        }
    });

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <form onSubmit={formik.handleSubmit} className="bg-white p-6 rounded shadow-md w-full max-w-sm">
                <h2 className="text-2xl font-bold mb-4">Sign Up</h2>
                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.email}
                    className="w-full p-2 mb-4 border rounded"
                />
                {formik.touched.email && formik.errors.email ? (
                    <div className="text-red-500">{formik.errors.email}</div>
                ) : null}
                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.password}
                    className="w-full p-2 mb-4 border rounded"
                />
                {formik.touched.password && formik.errors.password ? (
                    <div className="text-red-500">{formik.errors.password}</div>
                ) : null}
                <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.username}
                    className="w-full p-2 mb-4 border rounded"
                />
                {formik.touched.username && formik.errors.username ? (
                    <div className="text-red-500">{formik.errors.username}</div>
                ) : null}
                <input
                    type="text"
                    name="fullname"
                    placeholder="Full Name"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.fullname}
                    className="w-full p-2 mb-4 border rounded"
                />
                {formik.touched.fullname && formik.errors.fullname ? (
                    <div className="text-red-500">{formik.errors.fullname}</div>
                ) : null}
                <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">Sign Up</button>
            </form>
        </div>
    );
};

export default Signup;