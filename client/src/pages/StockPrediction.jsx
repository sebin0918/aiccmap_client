import React, { useState, useEffect, useMemo } from "react";
import {
  CartesianGrid,
  LineChart,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Brush,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "../styles/StockPredict.css";

const mainDataKeys = ["Samsung", "Apple", "Bitcoin"];
const DataKeys = ["predictSamsung", "predictApple", "predictBitcoin"];

// 툴팁= 커서 박스
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const date = payload[0].payload.date; // payload에서 날짜를 직접 가져옴
    return (
      <div className="stock-prediction-custom-tooltip">
        <p className="label">{`Date: ${date}`}</p>
        {payload.map((entry, index) => (
          <p key={index} className="intro">{`${entry.name}: ${entry.value.toLocaleString()}`}</p>
        ))}
      </div>
    );
  }

  return null;
};

// getMinMaxYValues 함수 정의
const getMinMaxYValues = (data, dataKeys) => {
  let minY = Infinity;
  let maxY = -Infinity;

  data.forEach((item) => {
    dataKeys.forEach((key) => {
      const value = item[key];
      if (value !== undefined && value !== null) {
        if (value < minY) minY = value;
        if (value > maxY) maxY = value;
      }
    });
  });

  return { minY, maxY };
};

// 메인함수
function StockPrediction() {
  const [data, setData] = useState([]);

  // 데이터 가져오기
  useEffect(() => {
    const fetchStockData = async () => {
      try {
        const request = await fetch(
          `${process.env.REACT_APP_API_URL}/api/stock-predict/stock-predict`,
          {
            method: "GET",
          }
        );

        if (!request.ok) {
          throw new Error("주식 정보를 가져오는 중 오류가 발생했습니다.");
        }
        const resData = await request.json();

        // 데이터 구조 확인 및 변환
        console.log("Fetched data:", resData); // 데이터 구조 확인
        const formattedData = resData.map((item) => ({
          date: item.x, // 날짜 키를 date로 변경
          xValue: new Date(item.x).getTime(), // 숫자형 x값 (타임스탬프)
          Samsung: item.Samsung,
          Apple: item.Apple,
          Bitcoin: item.Bitcoin,
          predictSamsung: item.predictSamsung,
          predictApple: item.predictApple,
          predictBitcoin: item.predictBitcoin,
        }));

        setData(formattedData);
      } catch (err) {
        console.error("주식 데이터 가져오기 비동기 통신 에러", err);
      }
    };
    fetchStockData();
  }, []);

  const [availableMainDataKeys, setAvailableMainDataKeys] =
    useState(mainDataKeys);
  const [availableDataKeys, setAvailableDataKeys] = useState(DataKeys);
  const [compareMainCompany, setCompareMainCompany] = useState(null);
  const [compareCompany, setCompareCompany] = useState(null);

  // 브러쉬 범위 상태 추가
  const [brushRange, setBrushRange] = useState(null);

  // 데이터가 로드되면 brushRange 설정
  useEffect(() => {
    if (data.length > 0) {
      const totalDataPoints = data.length; // 포인트 수
      const brushDataPoints = Math.min(80, totalDataPoints); // 데이터 길이를 넘지 않도록 설정
      const initialBrushRange = {
        startIndex: totalDataPoints - brushDataPoints,
        endIndex: totalDataPoints - 1,
      };
      setBrushRange(initialBrushRange);
    }
  }, [data]);

  // 브러쉬 변경 핸들러 함수
  const handleBrushChange = ({ startIndex, endIndex }) => {
    setBrushRange({ startIndex, endIndex });
  };

  // 표시되는 데이터 키 확인
  const displayedDataKeys = useMemo(() => {
    if (compareMainCompany) {
      return [compareMainCompany, `predict${compareMainCompany}`];
    }
    return [];
  }, [compareMainCompany]);

  // 최소값과 최대값 계산, 패딩 추가
  const { minY, maxY } = useMemo(() => {
    if (displayedDataKeys.length > 0 && data.length > 0 && brushRange) {
      const visibleData = data.slice(
        brushRange.startIndex,
        brushRange.endIndex + 1
      );
      let { minY, maxY } = getMinMaxYValues(visibleData, displayedDataKeys);

      // 패딩 추가
      const padding = (maxY - minY) * 0.1; // 데이터 범위의 10%를 패딩으로 사용
      minY = minY - padding;
      maxY = maxY + padding;

      // minY가 음수가 되지 않도록 조정
      if (minY < 0) minY = 0;

      return { minY, maxY };
    }
    return { minY: 0, maxY: 0 };
  }, [data, brushRange, displayedDataKeys]);

  // xValue를 키로 하는 맵 생성
  const xValueMap = useMemo(() => {
    const map = {};
    data.forEach((item) => {
      map[item.xValue] = item;
    });
    return map;
  }, [data]);

  // x축의 최소값과 최대값 계산
  const { minX, maxX } = useMemo(() => {
    if (data.length > 0 && brushRange) {
      const startX = data[brushRange.startIndex].xValue;
      const endX = data[brushRange.endIndex].xValue;
      return { minX: startX, maxX: endX };
    }
    return { minX: "auto", maxX: "auto" };
  }, [data, brushRange]);

  const handleAddMainCompany = (main_company) => {
    if (compareMainCompany) {
      setAvailableMainDataKeys((prev) => [...prev, compareMainCompany]);
    }
    setCompareMainCompany(main_company);
    setAvailableMainDataKeys((prev) => prev.filter((c) => c !== main_company));
  };

  const handleRemoveMainCompany = () => {
    if (compareMainCompany) {
      setAvailableMainDataKeys((prev) => [...prev, compareMainCompany]);
      setCompareMainCompany(null);
    }
  };

  const handleRemoveCompany = () => {
    if (compareCompany) {
      setAvailableDataKeys((prev) => [...prev, compareCompany]);
      setCompareCompany(null);
    }
  };

  // 데이터 선 색상 정의
  const getLineColor = (dataKey) => {
    if (dataKey === "Samsung") return "#00FFFF";
    if (dataKey === "Apple") return "#FF0000";
    if (dataKey === "Bitcoin") return "#FFFF00";
    if (dataKey === "predictSamsung") return "green";
    if (dataKey === "predictApple") return "green";
    if (dataKey === "predictBitcoin") return "green";
    return "#FFFFFF";
  };

  // 데이터가 로드되기 전 처리
  if (data.length === 0 || !brushRange) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 className="stock-prediction-header">Chart of Predict direction</h1>

      <div className="stock-prediction-info">
        <div className="stock-prediction-list">
          <h3 className="stock-prediction-list-event">종목</h3>
          {availableMainDataKeys.map((main_company) => (
            <div
              className="main-prediction-company"
              key={main_company}
              style={{ marginBottom: "10px", cursor: "pointer" }}
              onClick={() => handleAddMainCompany(main_company)}
            >
              {main_company}
            </div>
          ))}
          <div className="main-prediction-company-bottom" />
        </div>
        <div style={{ flex: 1 }}>
          <div className="chart-prediction-container">
            <ResponsiveContainer width="98%" height={500}>
              <ComposedChart
                data={data} // 전체 데이터를 전달
                margin={{
                  top: 0,
                  right: 30,
                  left: 30,
                  bottom: 0,
                }}
              >
                <XAxis
                  type="number"
                  dataKey="xValue"
                  domain={[minX, maxX]}
                  tickFormatter={(value) => {
                    const item = xValueMap[value];
                    return item
                      ? `${new Date(item.date).getFullYear()}년 ${
                          new Date(item.date).getMonth() + 1
                        }월`
                      : "";
                  }}
                  stroke="#fff"
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(value) => `${value.toLocaleString()}`}
                  stroke="#fff"
                  width={80}
                  domain={[minY, maxY]} // 패딩이 적용된 Y축 범위
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                {compareMainCompany && ( // 기업 그래프
                  <>
                    <Line
                      yAxisId="left"
                      type="linear"
                      dataKey={compareMainCompany}
                      stroke={getLineColor(compareMainCompany)}
                      strokeWidth={3}
                      dot={false}
                      isAnimationActive={false} // 애니메이션 비활성화로 성능 개선
                    />
                    <Line
                      yAxisId="left"
                      type="linear"
                      dataKey={`predict${compareMainCompany}`}
                      stroke={getLineColor(`predict${compareMainCompany}`)}
                      strokeWidth={3}
                      dot={false}
                      strokeDasharray="3 3" // 점선으로 예측 부분을 구분
                      isAnimationActive={false}
                    />
                  </>
                )}
                <Brush
                  dataKey="xValue" // 숫자형 x값 사용
                  height={15}
                  stroke="rgb(255,255,255)"
                  fill="rgb(0,0,0)"
                  travellerWidth={10}
                  tickFormatter={() => ""}
                  onChange={handleBrushChange} // 브러쉬 변경 핸들러 추가
                  startIndex={brushRange.startIndex}
                  endIndex={brushRange.endIndex}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="stock-prediction-list">
          <div className="stock-prediction-compare">
            <h3 className="stock-prediction-list-event">예측 데이터</h3>
            {compareMainCompany && (
              <div
                style={{
                  marginBottom: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                {compareMainCompany}
                <button
                  className="stock-prediction-minus-button"
                  onClick={handleRemoveMainCompany}
                >
                  ×
                </button>
              </div>
            )}
            {compareCompany && (
              <div
                style={{
                  marginBottom: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                {compareCompany}
                <button
                  className="stock-prediction-minus-button"
                  onClick={handleRemoveCompany}
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockPrediction;
