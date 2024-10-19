import React, { useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';  
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import '../styles/HouseHold.css';

const HouseHold = () => {
  const calendarRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [incomeEvents, setIncomeEvents] = useState([]);
  const [expenseEvents, setExpenseEvents] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [memos, setMemos] = useState({});
  const [selectedMemo, setSelectedMemo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  //const [currentMonth, setCurrentMonth] = useState(''); 
  const [searchQuery, setSearchQuery] = useState(''); 
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false); 
  const [searchResults, setSearchResults] = useState([]); 

  const today = new Date(); 

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching data from server...'); 
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/household/HouseHold`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        console.log('Server responded with status:', response.status); 

        if (!response.ok) {
          throw new Error('Failed to fetch data from server');
        }
        const data = await response.json();

        if (!data || !Array.isArray(data.data)) {
          console.error('Fetched data is not an array or is undefined:', data);
          return;
        }

        const formattedEvents = data.data.map((event) => {
          const eventType = parseInt(event.rp_part) === 0 ? '입금' : '출금'; 
          const rpAmount = parseFloat(event.rp_amount) || 0;
          return {
            rp_id: event.rp_id, 
            start: event.rp_date,
            title: `${eventType}: ₩${rpAmount.toLocaleString()}원`,
            type: eventType,
            rp_amount: rpAmount,
            rp_detail: event.rp_detail,
            allDay: true,
          };
        });
        setEvents(formattedEvents);
      } catch (error) {
        console.error('Error fetching household data:', error);
        console.log('Loading finished'); 
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, []);


    // 컴포넌트가 마운트될 때 모든 메모 불러오기 (선택 사항)
    useEffect(() => {
      const fetchInitialMemos = async () => {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/household/getAllMemos`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', 
          });
    
          if (!response.ok) {
            throw new Error('Failed to fetch memos from server');
          }
    
          const result = await response.json();
          
          if (result.memos) {
            setMemos(result.memos);  // 서버에서 모든 메모를 상태에 저장
          }
        } catch (error) {
          console.error('Error fetching initial memos:', error);
        }
      };
    
      fetchInitialMemos();
    }, []);
  

  const saveDataToServer = async (data) => {
    console.log('Saving data to server:', data);
    try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/household/addHouseHoldData`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',  
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error('Failed to save data to the server');
        }
        const result = await response.json();
        console.log('Data saved:', result);
        return result;
    } catch (error) {
        console.error('Error saving data:', error);
    }
};

const handleSaveButtonClick = async (type) => {
  const detailInput = document.getElementById(`house_transaction-detail${type === 'minus' ? '-minus' : ''}`);
  const amountInput = document.getElementById(`house_transaction-amount${type === 'minus' ? '-minus' : ''}`);
  const checkBox = document.getElementById(`household_check_hold${type === 'minus' ? '_minus' : ''}`);

  if (!detailInput || !amountInput || !checkBox) {
    console.error('One or more input elements are missing');
    return;
  }

  const detail = detailInput.value;
  const amount = amountInput.value;
  const isFixed = checkBox.checked ? 0 : 1;

  const data = {
    rp_date: selectedDate,
    rp_detail: detail,
    rp_amount: parseFloat(amount),
    rp_hold: isFixed,
    rp_part: type === 'plus' ? 0 : 1 
  };

  const savedData = await saveDataToServer(data);

  if (savedData) {
    const newEvent = {
      start: selectedDate,
      title: `${type === 'plus' ? '입금' : '출금'}: ₩${parseFloat(amount).toLocaleString()}원`,
      rp_amount: parseFloat(amount),
      rp_detail: detail,
      type: type === 'plus' ? '입금' : '출금',
    };

    setEvents((prevEvents) => [...prevEvents, newEvent]);

    if (type === 'plus') {
      setIncomeEvents((prevIncome) => [...prevIncome, newEvent]);
    } else {
      setExpenseEvents((prevExpense) => [...prevExpense, newEvent]);
    }

    calculateTotals(selectedDate);

    detailInput.value = '';
    amountInput.value = '';
    checkBox.checked = false;
    setSelectedMemo('');
  }
};

  // 기존 메모 저장 로직
  const saveMemoToServer = async (memoText) => {
    try {
      console.log("Memo Text:", memoText);  
      console.log("Selected Date:", selectedDate);  
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/household/saveOrUpdateMemo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',  
        body: JSON.stringify({ fm_memo: memoText, selectedDate })
      });
      if (!response.ok) {
        throw new Error('Failed to save memo to the server');
      }
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error saving memo:', error);
    }
  };
  
  // 새로운 메모 불러오는 로직 추가
  const fetchMemoFromServer = async (date) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/household/getMemo?date=${date}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', 
      });
  
      if (!response.ok) {
        throw new Error('Failed to fetch memo from server');
      }
      const result = await response.json();
      console.log(result)
      return result.memo;  // 서버에서 반환된 메모 데이터
    } catch (error) {
      console.error('Error fetching memo:', error);
    }
  };

const handleDeleteButtonClick = async (event) => {
  console.log('Event object:', event); 

  const rp_id = event.rp_id;  
  console.log('Deleting event with rp_id:', rp_id);

  if (!rp_id) {
    console.error('rp_id is missing');
    return;
  }

  const deletedData = await deleteDataFromServer(rp_id);
  if (deletedData) {
    setEvents((prevEvents) => prevEvents.filter((e) => e.rp_id !== rp_id));
    setIncomeEvents((prevIncome) => prevIncome.filter((e) => e.rp_id !== rp_id));
    setExpenseEvents((prevExpense) => prevExpense.filter((e) => e.rp_id !== rp_id));
    calculateTotals(selectedDate);
  }
};

const deleteDataFromServer = async (rp_id) => {
  try {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/household/deleteHouseHoldData?rp_id=${rp_id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',  
    });

    if (!response.ok) {
      throw new Error('Failed to delete data from server');
    }

    const result = await response.json();

    return result;
  } catch (error) {
    console.error('Error deleting data:', error);
  }
};
  

  const calculateTotals = (dateStr) => {
    const dayEvents = events.filter((event) => {
      const eventDate = new Date(event.start);
      const eventDateStr = eventDate
        .toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
        .replace(/\. /g, '-')
        .replace(/\./g, '');
      return eventDateStr === dateStr;
    });

    const incomeEvents = dayEvents.filter((e) => e.type === '입금');
    const expenseEvents = dayEvents.filter((e) => e.type === '출금');
    const totalIncome = incomeEvents.reduce((sum, e) => sum + e.rp_amount, 0);
    const totalExpense = expenseEvents.reduce((sum, e) => sum + e.rp_amount, 0);

    return { totalIncome, totalExpense, incomeEvents, expenseEvents };
  };

  // 날짜 클릭 시 메모 불러오는 로직과 기존 데이터 처리 통합
  const handleDateClick = async (info) => {
    setSelectedDate(info.dateStr);
    
    // 선택된 날짜에 대한 메모를 서버에서 불러옴
    const fetchedMemo = await fetchMemoFromServer(info.dateStr);
    
    // 가져온 메모를 상태에 저장
    if (fetchedMemo) {
      setMemos((prevMemos) => ({ ...prevMemos, [info.dateStr]: fetchedMemo }));
      setSelectedMemo(fetchedMemo); // 선택된 메모 설정
    } else {
      setSelectedMemo('');  // 메모가 없을 경우 빈 문자열
    }
    
    const { totalIncome, totalExpense, incomeEvents, expenseEvents } = calculateTotals(info.dateStr);
    setTotalIncome(totalIncome);
    setTotalExpense(totalExpense);
    setIncomeEvents(incomeEvents);
    setExpenseEvents(expenseEvents);  
    setIsModalOpen(true);
  };

  // 메모 수정 및 저장 처리
  const handleEditButtonClick = async () => {
    if (isEditing) {
      console.log("Memo being saved:", selectedMemo); 
      await saveMemoToServer(selectedMemo); 
      setMemos((prevMemos) => ({ ...prevMemos, [selectedDate]: selectedMemo }));
      setIsEditing(false);
      setIsModalOpen(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleSearch = async () => {
    console.log('검색어:', searchQuery);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/household/searchHouseHoldData`, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ searchQuery })
      });
      if (!response.ok) {
        throw new Error('Failed to search data');
      }
      const result = await response.json();
      if (result.data) {
        setSearchResults(result.data);
        setIsSearchModalOpen(true);
      }
    } catch (error) {
      console.error('Error searching household data:', error);
    }
  };

  const handleCloseSearchModal = () => {
    setIsSearchModalOpen(false); 
  };
  const dayCellDidMount = (info) => {
    const dateStr = info.date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
      .replace(/\. /g, '-')
      .replace(/\./g, '');
    const { totalIncome, totalExpense } = calculateTotals(dateStr);
    const content = (
      <div className="house_total-container">
        <div className="household_plustotalpay2">
          + {totalIncome.toLocaleString()}원
        </div>
        <div className="household_minustotalpay2">
          - {totalExpense.toLocaleString()}원
        </div>
      </div>
    );
    const rootElement = info.el.querySelector('.fc-daygrid-day-top');
    if (rootElement) {
      const root = ReactDOM.createRoot(rootElement);
      root.render(content);
    }
  };

  return (
    <div className="household">
      <div className="household-body">
        <div className="household-header">
          <h1>가계부</h1>
          <div className="household-search-container">
            <input
              type="text"
              className="household-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();  
                }
              }}
              placeholder="검색어 입력"
            />
            <button className="household-search-button" onClick={handleSearch}>
              검색
            </button>
          </div>

          {isLoading ? (
            <div class="loading-container">
            <p className='household-loading'>현재 거래내역을 조회중입니다.<br />
            조금만 기다려주세요.</p>
            </div>
          ) : (
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              timeZone="local"
              initialDate={today.toISOString().split('T')[0]}
              events={events}
              dateClick={handleDateClick}
              dayCellDidMount={dayCellDidMount}
              headerToolbar={{
                left: 'prev,next',
                center: 'title',
                right: '',
              }}
            />
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="household-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="household-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="household-modal-header">
              <h5 className="household-modal-title">Date Info</h5>
            </div>

            <div className="household-modal-body">
              <div id="household-modalDate">{selectedDate}</div>
              <div className="household-box-container">


              <div id="household-plusbox">
                <h2>[ 입금 내역 ]</h2>
                <div className="household_plustotalpay">
                  총 입금: <span style={{ fontWeight: 'bold' }}>{`+ ${totalIncome.toLocaleString()}원`}</span>
                </div>

                {/* 테이블 형식으로 내역 표시 */}
                <table className="household_plus_table">
                  <thead>
                    <tr>
                      <th>번호</th>
                      <th>상세 내용</th>
                      <th>금액</th>
                      <th>삭제</th> {/* 수정 상태일 때만 삭제 버튼 표시 */}
                    </tr>
                  </thead>
                  <tbody>
                    {incomeEvents.map((event, index) => (
                      <tr key={index}>
                  <td>{index         + 1}</td>
                  <td>{event.rp_detail}</td>
                  <td>{`+ ${event.rp_amount.toLocaleString()}원`}</td>
                  <td>
                  {isEditing && (
                  <button className="household-action-button" onClick={() => handleDeleteButtonClick(event)}>
                  -
                  </button>
                  )}
                </td>
                    </tr>
                ))}
                  </tbody>
                </table>

                  {isEditing && (
                    <div className="household_plusinbuttonbox">
                      <div>
                        <label className="household_plus_in_detailtext" htmlFor="house_transaction-detail">
                          거래 내역
                        </label>
                        <input type="text" id="house_transaction-detail" className="household_plus_in_detail" />
                      </div>

                      <div>
                        <label className="household_plus_in_amounttext" htmlFor="house_transaction-amount">
                          금액
                        </label>
                        <input
                          type="number"
                          id="house_transaction-amount"
                          className="household_plus_in_amount"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="household_plus_in_check_hold">
                        <label className="household_plus_in_check_holdtext">고정</label>
                        <input type="checkbox" id="household_check_hold" className="household_check_hold" />
                      </div>
                      <div>
                        <button className="household_plus_in_btn_save" onClick={() => handleSaveButtonClick('plus')}>
                          입력
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div id="household-minusbox">
                  <h2>[ 출금 내역 ]</h2>
                  <div className="household_minustotalpay">
                    총 출금: <span style={{ fontWeight: 'bold' }}> {`- ${totalExpense.toLocaleString()}원`}</span>
                  </div>

                  {/* 테이블 형식으로 내역 표시 */}
                  <table className="household_minus_table">
                    <thead>
                      <tr>
                        <th>번호</th>
                        <th>상세 내용</th>
                        <th>금액</th>
                        <th>삭제</th> {/* 수정 상태일 때만 삭제 버튼 표시 */}
                      </tr>
                    </thead>
                    <tbody>
                      {expenseEvents.map((event, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>{event.rp_detail}</td>
                          <td>{`- ${event.rp_amount.toLocaleString()}원`}</td>
                          <td>
                            {isEditing && (
                              <button className="household-action-button" onClick={() => handleDeleteButtonClick(event)}>
                                -
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {isEditing && (
                    <div className="household_minusinbuttonbox">
                      <div>
                        <label className="household_minus_in_detailtext" htmlFor="house_transaction-detail-minus">
                          거래 내역
                        </label>
                        <input type="text" id="house_transaction-detail-minus" className="household_minus_in_detail" />
                      </div>
                      
                      <div>
                        <label className="household_minus_in_amounttext" htmlFor="house_transaction-amount-minus">
                          금액
                        </label>
                        <input
                          type="number"
                          id="house_transaction-amount-minus"
                          className="household_minus_in_amount"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>

                      <div className="household_minus_in_check_hold">
                        <label className="household_minus_in_check_holdtext">고정</label>
                        <input type="checkbox" id="household_check_hold_minus" className="household_check_hold_minus" />
                      </div>
                      <div>
                        <button className="household_minus_in_btn_save" onClick={() => handleSaveButtonClick('minus')}>
                          입력
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                  <div id="household-memobox">
                    <textarea
                      id="memo-textarea"
                      placeholder="MEMO (수정버튼 클릭 후 사용하세요)"
                      value={selectedMemo}
                      onChange={(e) => setSelectedMemo(e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                    </div>
                  </div>

                <div className="household-modal-footer">
                  <button
                  type="button"
                  id="household-edit-btn"
                  className="household-btn household-btn-edit"
                  onClick={handleEditButtonClick}
                >
                  {isEditing ? '수정 완료' : '수정'}
                  </button>

                  <button
                  type="button"
                  className="household-btn household-btn-close"
                  onClick={() => setIsModalOpen(false)}
                  >
                  닫기
                </button>
                </div>
              </div>
            </div>
              )}

              {/* 검색 모달 추가 */}
              {isSearchModalOpen && (
                <div className="household-search-modal-overlay" onClick={handleCloseSearchModal}>
                  <div className="household-search-modal-container" onClick={(e) => e.stopPropagation()}>

                    <div className='household-search-modal-content'>
                      {/* 검색 결과 제목 */}
                      <h2 className="household-search-modal-title">
                          <span style={{ color: ' rgb(205, 76, 76)' }}>{searchQuery}</span> 검색 결과
                      </h2>
                      {/* 검색 결과 */}
                      <div className="household-search-results">
                        {searchResults.length === 0 ? (
                          <p>검색 결과가 없습니다.</p>
                        ) : (
                          <table className="household-search-results-table">
                            <thead>
                              <tr>
                                <th>번호</th>
                                <th>날짜</th>
                                <th>상세 내용</th>
                                <th>파트</th>
                                <th>금액</th>
                              </tr>
                            </thead>
                            <tbody>
                              {searchResults.map((item, index) => (
                                <tr key={index} className="search-result-item">
                                  <td>{index + 1}</td>
                                  <td>{new Date(item.rp_date).toISOString().split('T')[0]}</td>
                                  <td>{item.rp_detail}</td>
                                  <td>{item.rp_part}</td>
                                  <td>{item.rp_amount.toLocaleString()} 원</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>

                    {/* 닫기 버튼 */}
                    <button className="household-search-modal-close" onClick={handleCloseSearchModal}>
                      닫기
                    </button>
                  </div>
                </div>
              )}
              </div>
                );
              };

export default HouseHold;
