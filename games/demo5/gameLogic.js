
let size = [1,2,3,6,10,15]
function adjustReelData(result, requiredLengths) {
    let adjustedResult = [];
    result.forEach((reel, index) => {
        let requiredLength = requiredLengths[index]; // 每條滾輪的目標長度
        let currentLength = reel.length;
        if (currentLength >= requiredLength) {
            // 裁剪到所需長度
            adjustedResult.push(reel.slice(0, requiredLength));
        } else {
            // 保留前 4 個數據並循環補充剩餘部分
            let preserved = reel.slice(0, 4);
            let remaining = requiredLength - preserved.length;
            let extended = [];
            for (let i = 0; i < remaining; i++) {
                extended.push(reel[(i + 4) % currentLength]); // 循環補充數據
            }
            adjustedResult.push([...preserved, ...extended]);
        }
    });
    return adjustedResult;
}
function extractReelData(data, requiredLengths,kk) {
    let result = [];
    let result1 = [];
    let result2 = [];
    let Reel = [];
    let Reel1 = [];
    let f1 = data['fp'][kk];
    let reelS = randomChoice(data['Reel_size'],data.Reel_weight[1])
    let a = 0
    if(kk==1){
        Reel1 = data['Reel1']
        Reel = data['Reel']
        a = randomChoice(data.Mysterious[3],data.Mysterious[data.Reel_weight[0][reelS.index]-1]).value
    }else{
        Reel1 = data['Reel1z']
        Reel = data['Reelz']
        a = randomChoice(data.Mysterious1[3],data.Mysterious1[data.Reel_weight[0][reelS.index]-1]).value
    }
    let reelSelection = reelS.value
    
    // 遍歷每一條滾輪向量（Reel）
    for (let i = 0; i < reelSelection.length; i++) {
        let reelType = reelSelection[i]; // "N" 或 "MY"
        console.log(`Reel Type at index ${i}:`, reelType);
        let selectedReel = reelType === "N" ? Reel1[i] : Reel[i];
        let reelLength = selectedReel.length;
        let startIndex = Math.floor(Math.random() * reelLength); // 隨機起始位置
        // 使用環形抽選邏輯抽取 3 個元素
        let extracted = [];
        for (let j = 0; j < 12; j++) {
            let index = (startIndex + j) % reelLength;
            extracted.push(selectedReel[index]);
        }
        // 替換 8 為神秘數值 a
        let modifiedExtracted = extracted.map(value => {
            if (value === 8) {
                return a;
            } else if (value === 1&&i===2) {
                let rand = Math.random();
                if (rand <= f1[0]/100) {
                    console.log(f1[0])
                    return 2; // 76.5% 保持不变
                } else if (rand <= (f1[0]+f1[1])/100) {
                    return 14; // 20% 变成 14
                } else {
                    return 15; // 3.5% 变成 15
                }
            }
            return value;
        });
        result.push(modifiedExtracted);
        result1.push(modifiedExtracted.slice(1, 4));
    }
    result2 = adjustReelData(result, requiredLengths);
    return { result, result1, result2 };
}
  function flattenReel(reelData) {
    return reelData[0].map((_, colIndex) =>
        reelData.map(row => row[colIndex])
    ).flat();
}
function countSymbolInColumnsWithWild(gameBoard, targetSymbols) {
    let result = Array.from({ length: targetSymbols.length }, () => Array(gameBoard.length).fill(0));

    for (let col = 0; col < gameBoard[0].length; col++) {
        for (let row = 0; row < gameBoard.length; row++) {
            let symbol = gameBoard[row][col];
            // 遍歷每個目標符號，計算出現次數
            for (let i = 0; i < targetSymbols.length; i++) {
                if (symbol === targetSymbols[i] || symbol === 0) {
                    result[i][row]++;  // 目標符號或 Wild (0) 加入計數
                }
            }
        }
    }
    return result;
}
  function basepoint(x, y) {
    let totalScore = 0;
    let targetSymbols = [3, 4, 5, 6, 7, 9, 10, 11, 12, 13];
    let symbol = countSymbolInColumnsWithWild(x,targetSymbols)
      // 計算每個符號在這一列中的出現次數
      for (let row = 0; row < targetSymbols.length; row++) {
        if (symbol[row].slice(0, 5).reduce((acc, val) => acc * val, 1) !== 0) {
          totalScore += y[row][0]*symbol[row].slice(0, 5).reduce((acc, val) => acc * val, 1);  // 假設 y 的分數矩陣對應於這些符號
        } else if (symbol[row].slice(0, 4).reduce((acc, val) => acc * val, 1) !== 0) {
          totalScore += y[row][1]*symbol[row].slice(0, 4).reduce((acc, val) => acc * val, 1);  // 使用y[3]來獲取4連線的分數
        } else if (symbol[row].slice(0, 3).reduce((acc, val) => acc * val, 1) !== 0) {
          totalScore += y[row][2]*symbol[row].slice(0, 3).reduce((acc, val) => acc * val, 1);  // 使用y[2]來獲取3連線的分數
        }
  }
  return [totalScore || 0, symbol];
}


function point1(x, x1, y,dim) {
    let a = new Array(y).fill(0);  // 初始化分數陣列為 0

    for (let i = 0; i < y; i++) {
        if (x[i] === 1 || x[i] === 2) {
            a[i] = x1[i] * Math.pow(2, countMatches(x.slice(i, y), 4));
        } else if (x[i] === 3) {
            a[i] = a.slice(0, i).reduce((sum, value, index) => {
                return x[index] !== 6 ? sum + value : sum;
            }, 0);
        } else if (x[i] === 4) {
            a[i] = x1[i] * Math.pow(2, countMatches(x.slice(i, y), 4) - 1);
        } else if (x[i] === 5) {
            a[i] = x1[i] * Math.pow(2, countMatches(x.slice(i, y), 4));
        } else if (x[i] === 6) {
            a[i] = 3500/dim;
        }
    }
    return a;
}

// 輔助函數：計算陣列中目標值出現的次數
function countMatches(arr, target) {
    return arr.filter(value => value === target).length;
}
function sum(arr) {
    return arr.reduce((a, b) => a + b, 0);
}      
function randomChoice(arr, weights) {
    let total = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    let sum = 0;

    for (let i = 0; i < arr.length; i++) {
        sum += weights[i];
        if (rand < sum) {
            return { value: arr[i], index: i };  // 正確返回值和索引
        }
    }
    return { value: arr[arr.length - 1], index: arr.length - 1 };
}

        // 計算分數
function point(x, x1, x2, x4, x5) {
            let a = Array(x.length).fill(0);
            let a1 = Array(x.length).fill(0);
            
            for (let i = 0; i < x.length; i++) {
                if (x[i] === 1) {
                    a1[i] = randomChoice(data.base_pay, x1).value;
                    a[i] = a1[i] * 2 ** x.slice(i).filter(v => v === 4).length;
                }else if(x[i] === 2){
                    a1[i] = randomChoice(data.base_pay, x2).value;
                    a[i] = a1[i] * 2 ** x.slice(i).filter(v => v === 4).length;
                }else if (x[i] === 3) {
                    a1[i] = 0;
                    a[i] = a.slice(0, i).reduce((sum, v, idx) => sum + (x[idx] !== 6 ? v : 0), 0);
                } else if (x[i] === 4) {
                    a1[i] = randomChoice(data.base_pay, x4).value;  
                    a[i] = a1[i] * 2 ** (x.slice(i).filter(v => v === 4).length - 1);
                } else if (x[i] === 5) {
                    a1[i] = randomChoice(data.blue_pay, x5).value; 
                    a[i] = a1[i] * 2 ** x.slice(i).filter(v => v === 4).length;
                } else if (x[i] === 6) {
                    a[i] = 3500;
                    a1[i] = 3500;
                }
            }
            return [a, a1];
        }

function generateBallSequence(vec1, vec, drawType) {
            let startIndex = vec1.length - 1;  // 從初始球的最後一顆開始標記
            let result = new Array(vec.length).fill(0);  // 結果初始化為0

            // 抽選機率與數字集合
            const set1 = [0, 1, 2, 3];  // 類型 (1, 2, 6)
            const prob1 = [0.1, 0.2, 0.3, 0.4];
            
            const set2 = [1, 2, 3];  // 類型 (3, 4, 5)
            const prob2 = [0.12, 0.35, 0.53];

            // 遍歷標記部分進行抽選
            for (let i = startIndex; i < vec.length; i++) {
                let ball = vec[i];

                // 根據球的類型選擇不同的機率集合
                if ([1, 2, 6].includes(ball)) {
                    result[i] = randomChoice(set1, prob1).value;  // 類型一抽選
                } else if ([3, 4, 5].includes(ball)) {
                    result[i] = randomChoice(set2, prob2).value;  // 類型二抽選
                }
            }

            // 根據 drawType 修改最後一位
            if (drawType === 0 || drawType === 1) {
                result[result.length - 1] = 4;
            } else if (drawType === 2) {
                result[result.length - 1] = 1;
            }

            return result;
        }
        // 通用函數
function generalF(mode, x, y, dim, kk) {
    let result = Array(x).fill(0);
    let ballSequence = [];
    let originalScores = [];

    // 根據不同模式決定數據來源
    let modeData = {
        'green': ['green', 'green_major', 'green_grand'],
        'Red': ['Red', 'Red_major', 'Red_grand'],
        'Blue': ['Blue', 'Blue_major', 'Blue_grand'],
        'g_b': ['g_b', 'g_b_major', 'g_b_grand'],
        'g_r': ['g_r', 'g_r_major', 'g_r_grand'],
        'r_b': ['r_b', 'r_b_major', 'r_b_grand'],
        'g_r_b': ['g_r_b', 'g_r_b_major', 'g_r_b_grand']
    };

    let selectedMode = modeData[mode];
    if (!selectedMode) {
        console.error('Invalid mode selected:', mode);
        return null;
    }

    // 選擇要使用的數據
    let primary = data[selectedMode[0]];
    let major = data[selectedMode[1]];
    let grand = data[selectedMode[2]];
    if (['g_b', 'g_r', 'r_b'].includes(mode)) {
        kk += 1;
    } else if (mode === 'g_r_b') {
        kk += 2;
    }
    // 根據機率決定抽選區域
    let kk1 =   parseFloat(document.getElementById('gameMode').value); 
    let prob_major = (50 * dim * 0.007 / 3500) / sum(data['featurep'][kk1])* y;
    let prob_grand = (50 * dim * 0.012 / 12000) / sum(data['featurep'][kk1])* y;
    let drawType = Math.random() < (1 - prob_major - prob_grand) ? 0 : (Math.random() < prob_major / (prob_major + prob_grand) ? 1 : 2);
    let a3 = -1
    let aa;
    let a;
    if (drawType === 0) {
        a = randomChoice(Array.from({ length: primary[0].length }, (_, i) => i), primary[kk + 2]).value;
    } else if (drawType === 1) {
        aa = randomChoice(Array.from({ length: major[0].length }, (_, i) => i), major[kk + 3]);
        a = aa.value
        a3 = major[mode === 'g_r_b' ? 3:2][aa.index]
    } else {
        a = randomChoice(Array.from({ length: grand[0].length }, (_, i) => i), grand[kk + 2]).value;
    }

    let a1 = size.indexOf(y);
    function generateBalls(source, a, mode, drawType, a3) {
        let balls = Array(source[0][a]).fill(2);  // 基礎2號球

        if (mode === 'green') {
            balls = balls.concat(Array(source[1][a] - 1).fill(3));  // 3號球減1
        } else if (mode === 'Red') {
            balls = balls.concat(Array(source[1][a] - 1).fill(4));  // 4號球減1
        } else if (mode === 'Blue') {
            balls = balls.concat(Array(source[1][a] - 1).fill(5));  // 5號球減1
        } else if (mode === 'g_b') {
            balls = balls
                .concat(Array(source[1][a] - 1).fill(3))  // 3號球減1
                .concat(Array(source[drawType === 1 ? 3 : 2][a] - 1).fill(5));  // 5號球減1
        } else if (mode === 'g_r') {
            balls = balls
                .concat(Array(source[1][a] - 1).fill(3))  // 3號球減1
                .concat(Array(source[drawType === 1 ? 3 : 2][a] - 1).fill(4));  // 4號球減1
        } else if (mode === 'r_b') {
            balls = balls
                .concat(Array(source[1][a] - 1).fill(4))  // 4號球減1
                .concat(Array(source[drawType === 1 ? 3 : 2][a] - 1).fill(5));  // 5號球減1
        } else if (mode === 'g_r_b') {
            balls = balls
                .concat(Array(source[1][a] - 1).fill(3))  // 3號球減1
                .concat(Array(source[2][a] - 1).fill(4))  // 4號球減1
                .concat(Array(source[drawType === 1 ? 4 : 3][a] - 1).fill(5));  // 5號球減1
        }

        // 如果 drawType === 1 且 a3 === 1，則加入一顆6號球
        if (drawType === 1 && a3 === 1) {
            balls.push(6);
        }

        return balls;
    }

    for (let i = 0; i < x; i++) {
        let newBalls;

        if (drawType === 0) {
            newBalls = generateBalls(primary, a, mode, drawType, a3);
        } else if (drawType === 1) {
            newBalls = generateBalls(major, a, mode, drawType, a3);
        } else {
            newBalls = generateBalls(grand, a, mode, drawType, a3);
        }

        const vecMap = {
            green: {
                base: [1, 2, 2, 2, 2, 3],
                alt:  [1, 2, 6, 2, 2, 3]
            },
            Red: {
                base: [1, 2, 2, 2, 2, 4],
                alt:  [1, 2, 6, 2, 2, 4]
            },
            Blue: {
                base: [2, 2, 2, 2, 2, 5],
                alt:  [2, 2, 6, 2, 2, 5]
            },
            g_b: {
                base: [2, 2, 2, 2, 5, 3],
                alt:  [2, 6, 2, 2, 5, 3]
            },
            g_r: {
                base: [1, 2, 2, 2, 4, 3],
                alt:  [1, 2, 6, 2, 4, 3]
            },
            r_b: {
                base: [2, 2, 2, 2, 5, 4],
                alt:  [2, 6, 2, 2, 5, 4]
            },
            g_r_b: {
                base: [2, 2, 2, 5, 4, 3],
                alt:  [2, 6, 2, 5, 4, 3]
            }
        };

        // 動態選擇 vec1
        let vec1 = (drawType !== 1 || a3 === 1) 
            ? vecMap[mode].base
            : vecMap[mode].alt;
        let shuffledBalls = shuffle(newBalls);
        let vec = vec1.concat(shuffledBalls);
        let result0 = generateBallSequence(vec1, vec,drawType );
        let transformed = [];
        let firstNonZeroIndex = result0.findIndex(value => value > 0);
        let currentValue = firstNonZeroIndex;  // 保持索引值作為初始數字
        result0.forEach(value => {
            for (let i = 0; i < value; i++) {
                transformed.push(currentValue-4);  // 插入索引值
            }
            currentValue++;  // 遞增
        });

        ballSequence = vec;
        firstballSequence = vec1
        let count34 = vec.filter(value => value === 3 || value === 4).length;
        let scoreResult;
        if ((count34 >= 3 && mode === 'g_r_b')||(count34 >= 4 && mode === 'g_r')) {
            scoreResult = point(vec, data.bigl_ball[a1], data.norl_ball[a1], data.redl_ball[a1], data.bluel_ball[a1]);
        } else {
            scoreResult = point(vec, data.big_ball[a1], data.nor_ball[a1], data.red_ball[a1], data.blue_ball[a1]);
        }
        result[i] = sum(scoreResult[0]) / (88 * y);
        if(drawType==1){
            result[i] = (sum(scoreResult[0])*dim+(1-dim)*3500) / (50 *dim* y)
        }else if(drawType==2){
            result[i] = (sum(scoreResult[0])*dim+12000) / (50 *dim* y)
        }
        Scores = scoreResult[0];
        originalScores = scoreResult[1]
        holdspin = result0
        holdspin1 = transformed
        randomPositions = shuffle(Array.from({ length: 15 }, (_, i) => i));
        
    }
    
    return {
        score: result,
        ballSequence: ballSequence,
        firstballSequence: firstballSequence,
        Scores: Scores,
        originalScores: originalScores,
        holdspin: holdspin,
        holdspin1: holdspin1,
        randomPositions:randomPositions
    };
}
function rpoint(){
    let y = parseInt(document.getElementById('betMultiplier').value);  // y 來自 Bet Multiplier
    let dim = parseFloat(document.getElementById('dimValue').value);   // dim 來自 Dim Value
    let kk = parseInt(document.getElementById('gameMode').value);
    let a1 = size.indexOf(y);
    return randomChoice(data.base_pay, data.nor_ball[a1]).value;
}
function runGame(data,longspins) {
    // 獲取用戶選擇的參數
    let mode = gameMode;
    let y = parseInt(document.getElementById('betMultiplier').value);  // y 來自 Bet Multiplier
    let dim = parseFloat(document.getElementById('dimValue').value);   // dim 來自 Dim Value
    let kk = 1
    let kk1 =   parseFloat(document.getElementById('gameMode').value); 
    let x = 1;  // x 固定為 1

    // 執行 generalF 並獲取返回結果
    if (mainGameMode === 'hold_spin') {
        console.log("Hold & Spin 模式啟動");
        // 執行 generalF 並獲取返回結果
        let gameResult = generalF(mode, x, y, dim, kk);
        // 確保返回結果有效，避免出錯
        if (!gameResult) {
            console.error("generalF 返回 null 或 undefined，請檢查輸入參數");
            return;
        }

    // 解構返回結果並賦值給全域變數，供後續遊戲邏輯使用
    firstSequence = gameResult.firstballSequence
    totalSequence = gameResult.ballSequence;  // 總出球順序
    displayOrder = gameResult.holdspin1;      // 顯示球數順序
    win = gameResult.score;                   // 遊戲分數
    scoreVector = gameResult.Scores;          // 分數向量
    originalScores = gameResult.originalScores;
    randomPositions = randomPositions

    // 調試用，將結果輸出到控制台
    console.log("遊戲結果已存儲：", {
        mode,
        firstSequence,
        totalSequence,
        displayOrder,
        win,
        scoreVector,
        originalScores,
        randomPositions
    });
    // 如果需要啟動下一步邏輯或動畫，可以在這裡觸發
    // triggerNextPhase();  // 示例：啟動下一階段遊戲
}
else if (mainGameMode === 'base_game') {
    
    // 執行 Base Game 相關函數
    let { result, result1, result2 } = extractReelData(data, longspins,kk1);
    reelData = result1;  // 抽取滾輪數據
    longreelData = result2;
    console.log("Base Game 模式啟動",{ result, result1, result2});
    console.log("抽取的數量:", countSymbolInColumnsWithWild(reelData,[3, 4, 5, 6, 7, 9, 10, 11, 12, 13]));
    console.log("分數:", basepoint(reelData,data['linkpoint']));
    Result = basepoint(reelData,data['linkpoint']);  // 計算分數
    gameResult = Result[0]
    symbolCounts = Result[1]

    // 確保返回結果有效
    if (gameResult === null || gameResult === undefined) {
        console.error("Basepoint 返回 null 或 undefined，請檢查輸入參數");
        return;
    }

    // 儲存結果
    baseGameScore = gameResult
        // 最終分數
    console.log("Base Game 遊戲結果：", {
        reelData,
        longreelData,
        gameResult,
        symbolCounts
    });
}
}
// 隨機排序
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}