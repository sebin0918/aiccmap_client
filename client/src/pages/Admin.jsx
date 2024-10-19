import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // 리디렉션을 위한 useNavigate 훅 사용
import axios from 'axios'; 
import '../styles/Admin.css'; 
import adminlogo from '../images/map_logo_login.png';
import ReactPaginate from 'react-paginate'; 

const Admin = ({ setIsAuthenticated, setUserInfo }) => {
  const [users, setUsers] = useState([]);
  const [warnings, setWarnings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const usersPerPage = 5;
  const navigate = useNavigate();
  const [sessionStatuses, setSessionStatuses] = useState([]);  

  const logout = async () => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/logout`, {}, {
        withCredentials: true,
      });

      if (response.status === 200) {
        alert('로그아웃 하셨습니다\n메인화면으로 이동합니다.');
        setIsAuthenticated(false);
        setUserInfo(null);
        navigate('/'); 
      } else {
        console.error('Logout failed:', response.data);
      }
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };
// 세션 상태 가져오기
  useEffect(() => {
    const fetchSessionStatuses = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/session-status`, { withCredentials: true });
        console.log('Session Statuses fetched:', response.data.sessionStatuses); // 세션 상태 확인
        setSessionStatuses(response.data.sessionStatuses); // 세션 상태 설정
      } catch (error) {
        console.error('Error fetching session statuses:', error);
      }
    };
    fetchSessionStatuses();
  }, []);
  // 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/admin`, { withCredentials: true });
        setUsers(response.data.data);
  
        const initialWarnings = response.data.data.reduce((acc, user) => {
          acc[user.user_id] = user['경고 횟수'];
          return acc;
        }, {});
        setWarnings(initialWarnings);
        setLoading(false);
      } catch (error) {
        if (error.response && error.response.status === 403) {
          navigate('/'); // 권한이 없으면 홈으로 리디렉션
        } else {
          console.error('Error fetching admin data:', error);
          setError('데이터를 가져오는 중 오류가 발생했습니다.');
        }
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  // 경고 횟수 처리 함수
  const handleWarning = async (id) => {
    try {
      const currentCount = warnings[id] || 0;
      if (currentCount < 4) {
        const newCount = currentCount + 1;
        await axios.post(`${process.env.REACT_APP_API_URL}/api/admin/warning`, { user_id: id, warningCount: newCount }, {
          withCredentials: true 
        });
        setWarnings((prevWarnings) => ({
          ...prevWarnings,
          [id]: newCount
        }));
      }
    } catch (error) {
      console.error('Error updating warning:', error);
    }
  };
  // 삭제 처리 함수
  const handleDelete = async (id) => {
    try {
      console.log(`삭제: User ID ${id}`);
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/admin/delete/${id}`, {
        withCredentials: true  // 인증 정보를 전달
      });
      
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/admin`, { withCredentials: true });
      setUsers(response.data.data); 
      alert(`사용자 ID ${id}가 삭제되었습니다.`);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handlePageClick = (event) => {
    setCurrentPage(event.selected);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(0);
  };
  if (loading) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div>{error}</div>;
  }

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      String(user.user_id).toLowerCase().includes(searchLower) ||
      (user.이름 && String(user.이름).toLowerCase().includes(searchLower)) ||
      (user.Email && String(user.Email).toLowerCase().includes(searchLower)) ||
      (user.생년월일 && String(user.생년월일).toLowerCase().includes(searchLower)) ||
      (user.성별 && String(user.성별).toLowerCase().includes(searchLower)) ||
      (user.사용자권한 && String(user.사용자권한).toLowerCase().includes(searchLower)) ||
      (user.모바일 && String(user.모바일).toLowerCase().includes(searchLower))
    );
  });
  const offset = currentPage * usersPerPage;
  const currentPageUsers = filteredUsers.slice(offset, offset + usersPerPage);

  return (
    <div id="admin_body">
      <div className="admin-panel">
        <div className="admin-header">
          <div className="admin-header-left">
            <Link to="/">
              <img src={adminlogo} alt="Logo" className="admin-logo" />
            </Link>
            <p>사용자 관리</p>
          </div>
          <div className="admin-header-right">
            <input
              type="text"
              placeholder="검색..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="admin-search-input"
            />
            <button className="admin-logout-button" onClick={logout}>Log Out</button>
          </div>
        </div>
        <div className="admin-pageslide">
          <table className="admin-user-table">
            <thead className="admin-maintext">
              <tr>
                <th>접속</th>
                <th>User ID</th>
                <th>이름</th>
                <th>Email</th>
                <th>생년월일</th>
                <th>성별</th>
                <th>사용자권한</th>
                <th>모바일</th>
                <th>경고</th>
                <th>삭제</th>
                <th>경고 횟수</th>
              </tr>
            </thead>
            <tbody>
              {currentPageUsers.map((user) => {
              const isConnected = sessionStatuses.find(session => session.userId === user.user_id); 
              console.log(`User ID: ${user.user_id}, Session ID: ${user.sessionId}, isConnected: ${isConnected ? true : false}`);
              return (
                <tr key={user.user_id}>
                  <td>
                    <span className={`admin-status-dot ${isConnected ? 'online' : 'offline'}`}></span>
                  </td>
                  <td>{user.user_id}</td>
                  <td>{user.이름}</td>
                  <td>{user.Email}</td>
                  <td>{user.생년월일.slice(0, 10)}</td> 
                  <td>{user.성별}</td>
                  <td>{user.사용자권한}</td>
                  <td>{user.모바일}</td>
                  <td>
                    <button 
                      className="admin-warning-button" 
                      onClick={() => handleWarning(user.user_id)}
                      disabled={warnings[user.user_id] >= 3} 
                    >
                      경고
                    </button>
                  </td>
                  <td>
                    <button className="admin-delete-button" onClick={() => handleDelete(user.user_id)}>삭제</button>
                  </td>
                  <td>{warnings[user.user_id]}</td> 
                </tr>
                );
              })}
            </tbody>
          </table>
          <ReactPaginate
            previousLabel="◄"
            nextLabel="►"
            breakLabel={'...'}
            pageCount={Math.ceil(filteredUsers.length / usersPerPage)}
            marginPagesDisplayed={1}
            pageRangeDisplayed={5}
            onPageChange={handlePageClick}
            containerClassName={'admin-pagination-container'}
            pageClassName={'admin-pagination-page'}
            pageLinkClassName={'admin-pagination-link'}
            previousClassName={'admin-pagination-previous'}
            nextClassName={'admin-pagination-next'}
            activeClassName={'admin-pagination-active'}
            forcePage={currentPage}
          />
        </div>
      </div>
    </div>
  
  );
};

export default Admin;
