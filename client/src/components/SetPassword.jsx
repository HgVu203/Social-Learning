import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { setPassword } from '../services/authService'
import { useLocation } from 'react-router-dom';

const SetPassword = () => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const userId = queryParams.get('userId');

    const formik = useFormik({
        initialValues: {
            password: '',
            confirmPassword: ''
        },
        validationSchema: Yup.object({
            password: Yup.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').required('Mật khẩu là bắt buộc'),
            confirmPassword: Yup.string().oneOf([Yup.ref('password'), null], 'Mật khẩu không khớp').required('Xác nhận mật khẩu là bắt buộc')
        }),
        onSubmit: async (values) => {
            try {
                const response = setPassword({
                    userId,
                    password: values.password
                });
                window.location.href = '/';
            } catch (error) {
                alert(error.response.data.error);
            }
        }
    });

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <form onSubmit={formik.handleSubmit} className="bg-white p-6 rounded shadow-md w-full max-w-sm">
                <h2 className="text-2xl font-bold mb-4">Set Password</h2>
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
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm Password"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.confirmPassword}
                    className="w-full p-2 mb-4 border rounded"
                />
                {formik.touched.confirmPassword && formik.errors.confirmPassword ? (
                    <div className="text-red-500">{formik.errors.confirmPassword}</div>
                ) : null}
                <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">Set Password</button>
            </form>
        </div>
    );
};

export default SetPassword;