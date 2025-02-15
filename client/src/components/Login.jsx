import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { login } from '../services/authService';

const Login = () => {
    const formik = useFormik({
        initialValues: {
            email: '',
            password: ''
        },
        validationSchema: Yup.object({
            email: Yup.string().email('Email không hợp lệ').required('Email là bắt buộc'),
            password: Yup.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').required('Mật khẩu là bắt buộc')
        }),
        onSubmit: async (values) => {
            try {
                const response = await login(values);
                alert(response.data.message);
            } catch (error) {
                alert(error.response.data.error);
            }
        }
    });

    const handleGoogleLogin = () => {
        window.location.href = `${import.meta.env.VITE_API_URL}/google`;
    };

    const handleFacebookLogin = () => {
        window.location.href = `${import.meta.env.VITE_API_URL}/facebook`;
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <form onSubmit={formik.handleSubmit} className="bg-white p-6 rounded shadow-md w-full max-w-sm">
                <h2 className="text-2xl font-bold mb-4">Login</h2>
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
                <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">Login</button>
                <button type="button" onClick={handleGoogleLogin} className="w-full bg-red-500 text-white p-2 rounded mt-4">Login with Google</button>
                <button type="button" onClick={handleFacebookLogin} className="w-full bg-blue-700 text-white p-2 rounded mt-4">Login with Facebook</button>
            </form>
        </div>
    );
};

export default Login;