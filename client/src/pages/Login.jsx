import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/login.css';
import login_image from '../images/Login_image_1.png';
import login_logo from '../images/map_logo_login.png';
import signInButton from '../images/login_page_button.png';
import Footer from '../components/Footer';
import axios from 'axios';

const Login = ({ onLogin, initialErrorMessage }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState(initialErrorMessage || '');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();
        console.log('Submitting:', { email: trimmedEmail, password: trimmedPassword });

        try {
            // 서버에 로그인 요청 보내기
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
                user_email: trimmedEmail,
                user_password: trimmedPassword
            }, {
                withCredentials: true // 세션 쿠키 포함
            });

            if (response.status === 200) {
                await onLogin(trimmedEmail, trimmedPassword);  // 콜백 호출이 비동기라면 기다립니다.

                // 로그인 후 경고 횟수 확인
                try {
                    const warningCountResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/warning-count`, {
                        withCredentials: true,
                    });

                    if (warningCountResponse.data && warningCountResponse.data.warningCount !== undefined) {
                        const warningCount = warningCountResponse.data.warningCount;

                        // 이전 경고 횟수 가져오기 (localStorage 사용)
                        const previousWarningCount = localStorage.getItem('warningCount');

                        // 경고 횟수가 1 이상이고 이전 경고 횟수와 다를 때만 alert 표시
                        if (warningCount > 0 && warningCount !== Number(previousWarningCount)) {
                            alert(`현재 경고 횟수: ${warningCount}\n경고 4회시 페이지를 이용할 수 없습니다.`);
                            // 새로운 경고 횟수 저장
                            localStorage.setItem('warningCount', warningCount);
                        }
                    }
                } catch (warningError) {
                    if (warningError.response && warningError.response.status === 403) {
                        alert('접근 권한이 없습니다.'); // 권한이 없는 경우 처리
                    } else {
                        console.error('Error fetching warning count:', warningError);
                    }
                }

                navigate('/');  // 로그인 후 대시보드로 이동
            }
        } catch (error) {
            console.error('Login error:', error);
            setErrorMessage('로그인 실패. 이메일과 비밀번호를 확인해주세요.');
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-left">
                    <div className="illustration">
                        <img src={login_image} alt="illustration" />
                    </div>
                </div>
                <div className="login-right">
                    <div className="login-box">
                        <Link to="/">
                            <img src={login_logo} alt="MAP Logo" className="logo" />
                        </Link>
                        <h2>Welcome back !!!</h2>
                        <h1>Login</h1>
                        {errorMessage && <p className="error-message">{errorMessage}</p>}
                        <form onSubmit={handleSubmit}>
                            <label>Email</label>
                            <input
                                type="email"
                                placeholder="test@gmail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <label>Password</label>
                            <input
                                type="password"
                                placeholder="*********"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            {/* <div className="forgot-password">
                                <Link to="/forgot-password">Forgot Password?</Link>
                            </div> */}
                            <button type="submit" className="sign-in-btn">
                                <img src={signInButton} alt="Sign In" />
                            </button>
                        </form>
                        <div className="sign-up">
                            <p>I don't have an account? <Link to="/signup">Sign up</Link></p>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default Login;
