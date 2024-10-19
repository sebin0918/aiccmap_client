import React, { useState, useRef, useEffect } from 'react';
import './Components_Styles.css';
import Chatbot_image from '../images/ai_chat_image.png';
import mike_image from '../images/mike.png';
import mike_on_image from '../images/mike_on.jpg';
import speaker from '../images/speaker.png';

function ChatBot() {
  const [detailModalOpen, setDetailModalOpen] = useState(false);  // 상세 모달
  const [isListening, setIsListening] = useState(false);
  const [modalContent, setModalContent] = useState('');  // 모달창에 표시할 전체 내용
  const [isSpeaking, setIsSpeaking] = useState(false);  // TTS 상태 관리 (켬/끔)
  const [modalOpen, setModalOpen] = useState(false);  // 기본 모달
  const [chatList, setChatList] = useState([]);
  const [chat, setChat] = useState('');
  const modalBackground = useRef();

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let speechRecognition = useRef(null);

  const hyperlinkText = (text) => {
    // const urlRe = /^https:\/\/localhost(:\d+)?(\/\S*)?/g;  // localhost URL이 있는지 확인하는 정규식
    // if (urlRe.test(text)) {
    if (text.includes('https://localhost') || text.includes('http://localhost')) {
      const urlIndex = text.indexOf('http');
      const httpText = text.slice(urlIndex);
      return  `<a href="${httpText}" > ${text}</a>`; // 메시지 전체를 하이퍼링크로 변환  // target="_blank" = 새창
    }
    return text
  }

  useEffect(() => {
    const fetchChatList = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/chat-bot/chatList`, { credentials: 'include' });
        if (response.ok) {
          const chatdata = await response.json();
          // const linkChatData = hyperlinkText(chatdata);
          setChatList(chatdata);
        } else {
          console.error('Failed to fetch initial chat');
        }
      } catch (error) {
        console.error('Error fetching initial chat', error);
      }
    };
    fetchChatList();
  }, []);

  useEffect(() => {
    if (SpeechRecognition) {
      speechRecognition.current = new SpeechRecognition();
      speechRecognition.current.continuous = true;
      speechRecognition.current.interimResults = true;

      speechRecognition.current.onresult = (event) => {
        let transcript = event.results[event.resultIndex][0].transcript;
        setChat(transcript);
      };

      speechRecognition.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setChatList(prevChatList => [
        { text: '마이크가 연결이 되어있지 않거나,\n권한이 허용되지 않아 브라우저에서 마이크를 사용할 수 없습니다.', type: 'bot' },
        ...prevChatList,
      ]);
    }

    return () => {
      if (speechRecognition.current) {
        speechRecognition.current.stop();
      }
    };
  }, [SpeechRecognition]);

  const toggleListening = () => {
    if (!speechRecognition.current) {
      setChatList(prevChatList => [
        { text: '마이크가 연결이 되어있지 않거나,\n권한이 허용되지 않아 브라우저에서 마이크를 사용할 수 없습니다.', type: 'bot' },
        ...prevChatList,
      ]);
      return;
    }

    if (isListening) {
      speechRecognition.current.stop();
    } else {
      speechRecognition.current.start();
    }
    setIsListening(!isListening);
  };

  const handleSpeak = (text) => {
    const speech = window.speechSynthesis;

    if (!isSpeaking) {
      // TTS 시작
      const utterance = new SpeechSynthesisUtterance(text); // 읽을 텍스트 설정
      utterance.lang = 'ko-KR'; // 언어 설정 (한국어)

      utterance.onend = () => {
        // TTS가 종료되면 상태 업데이트
        setIsSpeaking(false);
      };

      speech.speak(utterance); // 텍스트 읽기
      setIsSpeaking(true);  // TTS 상태를 '켜짐'으로 설정
    } else {
      // TTS 중지
      speech.cancel();  // 현재 음성 중지
      setIsSpeaking(false);  // TTS 상태를 '꺼짐'으로 설정
    }};

  const handleSendChat = async () => {
    if (chat.trim()) {
      const newMessage = { text: chat, type: 'user' };
      setChatList(prevChatList => [newMessage, ...prevChatList]);
      const currentChat = chat;
      setChat('');

      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/chat-bot/chatbot`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: currentChat }),
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data) {
            const message = data.data;
            setChatList(prevChatList => [{ text: message, id: data.newChatId, type: 'bot' }, ...prevChatList]);
          }
        } else if (response.status  === 401) {
            console.error('User authentication error');
            setChatList(prevChatList => [{ text: "로그인 후 이용해 주세요.", type: 'bot' }, ...prevChatList]);
        }else {
          console.error('Failed to send chat message');
          setChatList(prevChatList => [{ text: "오류가 발생하였습니다.\n올바른 형식으로 다시 질문해 주세요.", type: 'bot' }, ...prevChatList]);
        }
      } catch (error) {
        console.error('Error sending chat message', error);
      }
    }
  };

  const handleEnter = (e) => {
    if (e.key === 'Enter') {
      handleSendChat();
      setChat('');
    }
  };

  // 상세 내용 모달 열기
  const openDetailModal = async (chatId) => {
    console.log('chatId:', chatId);
    if (!chatId) {
      console.error('chatId가 정의되지 않았습니다.');
      return;
    }
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/chat-bot/chatDetail/${chatId}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setModalContent(data.cb_text); // 데이터베이스에서 가져온 내용을 모달에 설정
        setDetailModalOpen(true);
      } else {
        console.error('Failed to fetch chat detail');
      }
    } catch (error) {
      console.error('Error fetching chat detail', error);
    }
  };

  return (
    <div className='ChatBot'>
      <img className='ChatBot-image' src={Chatbot_image} onClick={() => setModalOpen(true)} alt="Chatbot Icon" />
      {
        modalOpen &&
        <div className='ChatBot-modal-container' ref={modalBackground} onClick={e => {
          if (e.target === modalBackground.current) {
            setModalOpen(false);
          }
        }}>
          <div className='ChatBot-modal-content'>
            <div className='ChatBot-modal-text'>
            {
              chatList.length === 0 ? (
                <div className={`ChatBot-message-container bot`}>
                  <p style={{ whiteSpace: 'pre-line', textAlign: 'center' }} className={`ChatBot-message ChatBot-answer`}><img style={{width: '80px', height: '80px'}} src={Chatbot_image} alt='Chatbot'></img><br />안녕하세요. <br /><br />MAP beta ver 0.1 챗봇 서비스는 <br /><br />현재 재무현황과 주가 관련 정보만을 제공하고 있으며, <br /><br />한 문장에 한 가지 질문에 대해서만 답변이 가능합니다. <br /><br />이부분 유의하여 이용 부탁드립니다. <br /><br />이 메세지를 다시 보시려면 "<strong>!help</strong>"를 입력해 주세요.<br /><br />감사합니다. ( _ _ )</p>
                  
                </div>
              ) : (
                chatList.map((ct, index) => {
                  // ct.text가 존재하는지 확인하고 문자열 타입인지 확인
                  if (typeof ct.text !== 'string') {
                    console.error('ct.text is not a string:', ct.text);
                    return null; // 잘못된 데이터는 렌더링하지 않음
                  }
              
                  const lines = ct.text.split('\n'); // 줄바꿈으로 텍스트 분리
                  const isLongText = lines.length > 10; // 10줄이 넘는지 확인
              
                  return (
                    <div key={index} className={`ChatBot-message-container ${ct.type === 'user' ? 'user' : 'bot'}`}>
                      <p style={{ whiteSpace: 'pre-line' }} className={`ChatBot-message ${ct.type === 'user' ? 'ChatBot-question' : 'ChatBot-answer'}`}>
                        {isLongText ? (
                          <>
                            {lines.slice(0, 10).join('\n')}
                            <br />...
                            <button onClick={() => openDetailModal(ct.id)} className='ChatBot-detail-button'>상세 내용</button>
                          </>
                        ) : (
                          // 'dangerouslySetInnerHTML'을 사용하여 하이퍼링크 처리
                          <span dangerouslySetInnerHTML={{ __html: hyperlinkText(ct.text) }} />
                        )}
                      </p>
                  
                      {ct.type === 'bot' && (
                        <button 
                          className="ChatBot-speaker-button" 
                          onClick={() => handleSpeak(ct.text)} // 클릭 시 TTS 적용
                        >
                          {isSpeaking ? '' : ''}<img src={speaker} alt="Bot Avatar" className="ChatBot-speaker-image" />
                        </button>
                      )}
                    </div>
                  );
                  
                  
                })
              )
            }
            </div>

            <input 
              className='ChatBot-modal-input'
              type='text'
              value={chat}
              onChange={(e) => setChat(e.target.value)}
              onKeyDown={handleEnter}
              placeholder='메세지를 입력하세요...'
            />
            <button 
              onClick={toggleListening}
              className='Chatbot-stt-button'
            >
              {isListening ? (
                <img className='Chatbot-mike-button' src={mike_on_image} alt="Microphone On" />
              ) : (
                <img className='Chatbot-mike-button' src={mike_image} alt="Microphone Off" />
              )}
            </button>
            <button 
              type='submit' 
              className='ChatBot-modal-send-button'
              onClick={handleSendChat}
            >SEND</button>
          </div>
        </div>
      }

      {
        detailModalOpen &&  // 상세 내용 모달 창
        <div className='ChatBot-detail-modal'>
          <div className='ChatBot-detail-modal-content'>
            <h2>상세 내용</h2>
            <p>{modalContent}</p> {/* 모달에 전체 내용 표시 */}
            <button onClick={() => setDetailModalOpen(false)}>닫기</button>
          </div>
        </div>
      }
    </div>
  );
}

export default ChatBot;
