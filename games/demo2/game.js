// Game Engine Class
class SugarBangBang {
    constructor() {
        this.gameData = data;
        this.board = [];
        this.currentGameSet = 1;
        this.totalScore = 0;
        this.currentWin = 0;
        this.currentFreeGameWin = 0; // 本局FreeGame总得分
        this.cascadeCount = 0;
        this.totalSpins = 0;
        this.maxWin = 0;
        this.cascadeWins = []; // 记录每次cascade的得分详情
        this.isPlaying = false;
        this.isFreeGame = false; // 是否在FreeGame模式
        this.freeGameSpinsLeft = 0; // 剩余FreeGame次数
        
        this.symbolImages = {
            0: 'pic/WW.png',      // Wild
            1: 'pic/C1.png',      // C1
            2: 'pic/M1.png',      // M1
            3: 'pic/M2.png',      // M2
            4: 'pic/M3.png',      // M3
            5: 'pic/M4.png',      // M4
            6: 'pic/M5.png',      // M5
            7: 'pic/M6.png',      // M6
            8: 'pic/M7.png',      // M7
            9: 'pic/M8.png',      // M8
            10: 'pic/M1G.png',    // Golden M1
            11: 'pic/M2G.png',    // Golden M2
            12: 'pic/M3G.png',    // Golden M3
            13: 'pic/M4G.png',    // Golden M4
            14: 'pic/M5G.png',    // Golden M5
            15: 'pic/M6G.png',    // Golden M6
            16: 'pic/M7G.png',    // Golden M7
            17: 'pic/M8G.png',    // Golden M8
            18: 'pic/M1.png',     // MY1 (will convert to M)
            19: 'pic/M2.png',     // MY2
            20: 'pic/M3.png',     // MY3
            21: 'pic/M4.png',     // MY4
            22: 'pic/M5.png',     // MY5
            23: 'pic/M6.png',     // MY6
            24: 'pic/M7.png',     // MY7
            25: 'pic/M8.png',     // MY8
            26: 'pic/M1G.png',    // Golden MY1
            27: 'pic/M2G.png',    // Golden MY2
            28: 'pic/M3G.png',    // Golden MY3
            29: 'pic/M4G.png',    // Golden MY4
            30: 'pic/M5G.png',    // Golden MY5
            31: 'pic/M6G.png',    // Golden MY6
            32: 'pic/M7G.png',    // Golden MY7
            33: 'pic/M8G.png',    // Golden MY8
            34: 'pic/WW1.png'     // WILD1
        };
        
        // 预加载的图片对象
        this.preloadedImages = {};
        this.imagesLoaded = false;
        
        this.preloadImages().then(() => {
            this.initBoard();
            this.attachEventListeners();
        });
    }
    
    async preloadImages() {
        // 预加载所有图片
        const uniquePaths = [...new Set(Object.values(this.symbolImages))];
        const loadPromises = uniquePaths.map(path => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    this.preloadedImages[path] = img.src;
                    resolve();
                };
                img.onerror = () => {
                    console.error('Failed to load image:', path);
                    this.preloadedImages[path] = path; // 失败时仍使用路径
                    resolve(); // 继续加载其他图片
                };
                img.src = path;
            });
        });
        
        await Promise.all(loadPromises);
        this.imagesLoaded = true;
        console.log('All images preloaded');
    }
    
    normalizeSymbol(symbol) {
        // 將符號標準化：黃金版本轉為對應的普通版本
        // M1~M8: 2-9 (保持不變)
        // 黃金M1~M8: 10-17 -> 2-9
        // MY1~MY8: 18-25 (保持不變)
        // 黃金MY1~MY8: 26-33 -> 18-25
        // WILD/C1/WILD1: 保持不變
        if (symbol >= 10 && symbol <= 17) {  // 黃金M1~M8 -> M1~M8
            return symbol - 8;
        } else if (symbol >= 26 && symbol <= 33) {  // 黃金MY1~MY8 -> MY1~MY8
            return symbol - 8;
        } else {
            return symbol;
        }
    }
    
    initBoard() {
        const boardElement = document.getElementById('gameBoard');
        boardElement.innerHTML = '';
        
        for (let row = 0; row < 4; row++) {
            this.board[row] = [];
            for (let col = 0; col < 5; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                const img = document.createElement('img');
                cell.appendChild(img);
                
                boardElement.appendChild(cell);
                this.board[row][col] = 0;
            }
        }
        
        this.renderBoard();
    }
    
    attachEventListeners() {
        document.getElementById('spinBtn').addEventListener('click', () => this.spin());
        document.getElementById('freeGameBtn').addEventListener('click', () => this.startFreeGame());
        
        // 添加空格键触发旋转
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault(); // 防止页面滚动
                
                // 直接调用spin，spin会自动判断是否应该调用FreeGame
                if (!this.isPlaying) {
                    this.spin();
                }
            }
        });
        
        // 更新FreeGame按钮文本
        this.updateFreeGameButton();
    }
    
    weightedChoice(weights) {
        const total = weights.reduce((sum, w) => sum + w, 0);
        if (total === 0) return 0;
        
        let r = Math.random() * total;
        let cumsum = 0;
        
        for (let i = 0; i < weights.length; i++) {
            cumsum += weights[i];
            if (r < cumsum) return i;
        }
        return weights.length - 1;
    }
    
    generateInitialBoard() {
        const symbols = this.gameData[`baseGameSymbol${this.currentGameSet}`];
        const weights = this.gameData[`baseGameSymbolWeight${this.currentGameSet}`];
        
        for (let col = 0; col < 5; col++) {
            const colSymbols = symbols[col];
            const colWeights = weights[col];
            const startPos = this.weightedChoice(colWeights);
            const reelLen = colSymbols.length;
            
            for (let row = 0; row < 4; row++) {
                this.board[row][col] = colSymbols[(startPos + row) % reelLen];
            }
        }
    }
    
    generateMyMapping() {
        // 照搬 simulation.py 的逻辑：生成 MY1~MY8 到 M1~M8 的映射
        // 一次 SPIN 内所有 MY 符号使用相同映射
        const myWeights = this.gameData[`baseGameMY${this.currentGameSet}`];
        
        this.myToM = new Array(8).fill(0);  // MY1~MY8 -> M1~M8 索引
        const available = new Array(8).fill(true);  // M1~M8 是否可用
        
        // 从 MY1 开始依次抽选
        for (let myIdx = 0; myIdx < 8; myIdx++) {
            // 计算可用 M 符号的权重
            const validWeights = myWeights.map((w, i) => available[i] ? w : 0);
            
            // 抽选一个可用的 M 符号
            const mIdx = this.weightedChoice(validWeights);
            this.myToM[myIdx] = mIdx;
            available[mIdx] = false;
        }
        
        console.log('MY映射:', this.myToM);
    }
    
    convertMySymbols() {
        // 使用预先生成的映射转换 MY 符号
        if (!this.myToM) return;
        
        let conversionCount = 0;
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 5; col++) {
                const symbol = this.board[row][col];
                
                if (symbol >= 18 && symbol <= 25) {
                    // 普通 MY 符号 -> M 符号
                    const myIdx = symbol - 18;
                    const mIdx = this.myToM[myIdx];
                    const newSymbol = 2 + mIdx;
                    console.log(`转换MY符号 [${row}][${col}]: MY${myIdx+1}(${symbol}) -> M${mIdx+1}(${newSymbol})`);
                    this.board[row][col] = newSymbol;
                    conversionCount++;
                } else if (symbol >= 26 && symbol <= 33) {
                    // 黄金 MY 符号 -> 黄金 M 符号
                    const myIdx = symbol - 26;
                    const mIdx = this.myToM[myIdx];
                    const newSymbol = 10 + mIdx;
                    console.log(`转换金色MY符号 [${row}][${col}]: GMY${myIdx+1}(${symbol}) -> GM${mIdx+1}(${newSymbol})`);
                    this.board[row][col] = newSymbol;
                    conversionCount++;
                }
            }
        }
        if (conversionCount > 0) {
            console.log(`总共转换了 ${conversionCount} 个MY符号`);
        }
    }
    
    countC1() {
        // 统计版面上的C1数量
        let count = 0;
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 5; col++) {
                if (this.board[row][col] === 1) { // C1
                    count++;
                }
            }
        }
        return count;
    }
    
    updateFreeGameButton() {
        const btn = document.getElementById('freeGameBtn');
        if (this.freeGameSpinsLeft > 0) {
            btn.querySelector('.btn-text').textContent = `FreeGame (${this.freeGameSpinsLeft}次)`;
            btn.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        } else {
            btn.querySelector('.btn-text').textContent = 'FreeGame (測試)';
            btn.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
        }
    }
    
    async startFreeGame() {
        if (this.isPlaying) return;
        
        // 只有在不是FreeGame模式时才初始化
        if (!this.isFreeGame) {
            // 测试模式：直接给10场
            if (this.freeGameSpinsLeft === 0) {
                this.freeGameSpinsLeft = 10;
                console.log('测试模式：直接触发10场FreeGame');
            }
            
            this.isFreeGame = true;
            this.currentWin = 0; // FreeGame开始时重置总得分
            this.currentFreeGameWin = 0; // 重置本局FreeGame得分
            
            // 显示FreeGame得分栏
            document.getElementById('freeGameWinItem').style.display = 'flex';
            
            // 添加FreeGame背景
            document.body.classList.add('freegame-mode');
        }
        
        this.updateFreeGameButton();
        
        // 执行一次FreeGame spin
        await this.spinFreeGame();
    }
    
    async spinFreeGame() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        // 注意：FreeGame不重置currentWin，累加整个FreeGame期间的得分
        // currentWin在整个FreeGame期间一直累加，不要清零
        this.cascadeCount = 0;
        this.cascadeWins = [];
        this.totalSpins++;
        
        document.querySelectorAll('.multiplier-light').forEach(light => {
            light.classList.remove('active');
        });
        
        document.getElementById('spinBtn').disabled = true;
        document.getElementById('freeGameBtn').disabled = true;
        
        // FreeGame使用Freewheel选择参数组
        const freewheel = this.gameData.Freewheel;
        console.log('Freewheel权重配置:', freewheel);
        const selectedIndex = this.weightedChoice(freewheel);
        this.currentGameSet = selectedIndex + 1;
        
        console.log(`FreeGame选中索引: ${selectedIndex}, 使用参数组: ${this.currentGameSet}`);
        
        // 使用FreeGameSymbol生成初始版面
        this.generateInitialBoardFreeGame();
        this.generateMyMapping();
        this.convertMySymbols();
        
        await this.renderBoard(true);
        await this.sleep(200);
        
        // Cascade loop
        while (this.cascadeCount < 50) {
            const explodedCols = Array(5).fill(false);
            this.checkAndTriggerWild1Explosion(explodedCols);
            
            if (explodedCols.some(v => v)) {
                // WILD1爆炸后不会引入新符号，但为了保险还是调用一次
                this.convertMySymbols();
                await this.renderBoard();
                await this.sleep(300);
            }
            
            const matches = this.checkMatches();
            if (!matches.some(row => row.some(v => v))) {
                break;
            }
            
            this.updateMultiplierLights();
            
            await this.highlightMatches(matches);
            
            const { totalWin, winDetails } = this.calculateWin(matches, explodedCols);
            
            // FreeGame倍数：2x, 4x, 6x, 10x
            let multiplier;
            if (this.cascadeCount === 0) multiplier = 2;
            else if (this.cascadeCount === 1) multiplier = 4;
            else if (this.cascadeCount === 2) multiplier = 6;
            else multiplier = 10;
            
            const finalWin = totalWin * multiplier;
            this.currentWin += finalWin;
            
            this.updateUI();
            
            // 记录本次cascade的得分详情（即使得分为0也要记录，保持连锁编号连续）
            this.cascadeWins.push({
                cascade: this.cascadeCount,
                multiplier: multiplier,
                wins: winDetails,
                total: finalWin
            });
            
            await this.sleep(500);
            
            await this.removeMatchedSymbols(matches);
            
            this.applyGravityAndFill(matches);
            this.convertMySymbols();  // 转换新补充的MY符号
            await this.renderBoardWithGravity();
            
            this.cascadeCount++;
        }
        
        this.totalScore += this.currentWin;
        this.maxWin = Math.max(this.maxWin, this.currentWin);
        
        // 注意：currentWin在FreeGame期间是累计的，所以currentFreeGameWin就等于currentWin
        this.currentFreeGameWin = this.currentWin;
        
        // FreeGame中检查retrigger
        const c1Count = this.countC1();
        if (c1Count >= 3) {
            this.freeGameSpinsLeft += 5;
            console.log(`FreeGame Retrigger！C1数量: ${c1Count}，再获得5次`);
        }
        
        // 减少剩余次数
        this.freeGameSpinsLeft--;
        
        // 检查是否FreeGame结束
        if (this.freeGameSpinsLeft <= 0) {
            this.isFreeGame = false;
            console.log(`FreeGame结束！总共赢得: ${this.currentFreeGameWin.toLocaleString()}`);
            // 隐藏FreeGame得分栏
            document.getElementById('freeGameWinItem').style.display = 'none';
            // 恢复背景色
            document.body.classList.remove('freegame-mode');
        }
        
        this.updateFreeGameButton();
        this.logResult();
        this.updateUI();
        
        document.getElementById('spinBtn').disabled = false;
        document.getElementById('freeGameBtn').disabled = false;
        this.isPlaying = false;
    }
    
    generateInitialBoardFreeGame() {
        // 使用FreeGameSymbol生成初始版面
        const symbols = this.gameData[`FreeGameSymbol${this.currentGameSet}`];
        const weights = this.gameData[`FreeGameSymbolWeight${this.currentGameSet}`];
        
        this.board = Array(4).fill(null).map(() => Array(5).fill(0));
        
        for (let col = 0; col < 5; col++) {
            const startPos = this.weightedChoice(weights[col]);
            const reelLen = symbols[col].length;
            
            for (let row = 0; row < 4; row++) {
                this.board[row][col] = symbols[col][(startPos + row) % reelLen];
            }
        }
    }
    
    checkMatches() {
        const matches = Array(4).fill(null).map(() => Array(5).fill(false));
        
        // 调试：输出当前版面
        console.log('检查消除时的版面:');
        let hasMY = false;
        for (let row = 0; row < 4; row++) {
            console.log(`Row ${row}: ${this.board[row].join(', ')}`);
            for (let col = 0; col < 5; col++) {
                if (this.board[row][col] >= 18 && this.board[row][col] <= 33) {
                    hasMY = true;
                }
            }
        }
        if (hasMY) {
            console.warn('⚠️ 警告：检查消除时发现版面上仍有MY符号！这可能导致计算错误。');
        }
        
        // 對每個非 wild 符號檢查 ways 連線
        // 只檢查普通版本的符號 (M1~M8: 2-9, MY1~MY8: 18-25)，C1不參與消除
        for (let symbol = 2; symbol <= 33; symbol++) {  // 從2開始，跳過C1
            if (symbol === 0 || symbol === 34) continue;  // 跳過 WILD 和 WILD1
            if (symbol >= 10 && symbol <= 17) continue;  // 跳過黃金M，已包含在普通M中
            if (symbol >= 26 && symbol <= 33) continue;  // 跳過黃金MY，已包含在普通MY中
            
            const colCounts = Array(5).fill(0);
            
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 5; col++) {
                    const boardSymbol = this.board[row][col];
                    const normSymbol = this.normalizeSymbol(boardSymbol);
                    // wild (0) 和 WILD1 (34) 都可以替代任何符號
                    if (normSymbol === symbol || boardSymbol === 0 || boardSymbol === 34) {
                        colCounts[col]++;
                    }
                }
            }
            
            let length = 0;
            for (let col = 0; col < 5; col++) {
                if (colCounts[col] > 0) {
                    length++;
                } else {
                    break;
                }
            }
            
            if (length >= 3) {
                console.log(`符号 ${symbol} (M${symbol-1}) 匹配 ${length} 列, colCounts:`, colCounts);
                
                for (let row = 0; row < 4; row++) {
                    for (let col = 0; col < length; col++) {
                        const boardSymbol = this.board[row][col];
                        const normSymbol = this.normalizeSymbol(boardSymbol);
                        if (normSymbol === symbol || boardSymbol === 0 || boardSymbol === 34) {
                            matches[row][col] = true;
                            console.log(`  标记位置 [${row}][${col}] = ${boardSymbol} (norm: ${normSymbol})`);
                        }
                    }
                }
            }
        }
        
        console.log('最终matches矩阵:');
        for (let row = 0; row < 4; row++) {
            console.log(`Row ${row}: ${matches[row].map(m => m ? 'T' : 'F').join(' ')}`);
        }
        
        return matches;
    }
    
    checkAndTriggerWild1Explosion(explodedCols) {
        // 檢查版面上是否有 WILD1 標記，觸發整列爆炸
        for (let col = 0; col < 5; col++) {
            let hasWild1 = false;
            for (let row = 0; row < 4; row++) {
                if (this.board[row][col] === 34) {  // WILD1
                    hasWild1 = true;
                    break;
                }
            }
            
            if (hasWild1) {
                // 有WILD1標記 → 觸發整列爆炸
                explodedCols[col] = true;
                console.log(`WILD1觸發整列爆炸 at 列${col}`);
                // 將該列除了C1以外的符號變為WILD
                for (let row = 0; row < 4; row++) {
                    if (this.board[row][col] !== 1) {  // C1的ID是1
                        this.board[row][col] = 0;  // 變為WILD
                    }
                }
            }
        }
    }
    
    calculateWin(matches, explodedCols) {
        const linkpoint = this.gameData.linkpoint;
        // BaseGame: 固定值 [4,4,4,4,4]
        // FreeGame: 累加值 [5,6,8,10,15]
        const explosionValues = this.isFreeGame ? [5, 6, 8, 10, 15] : [4, 4, 4, 4, 4];
        let totalWin = 0;
        const winDetails = []; // 记录每个符号的得分详情
        
        // 检查匹配区域内有哪些实际符号
        const matchedSymbols = new Set();
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 5; col++) {
                if (matches[row][col]) {
                    matchedSymbols.add(this.board[row][col]);
                }
            }
        }
        console.log('匹配区域内的符号:', Array.from(matchedSymbols).sort((a,b)=>a-b).join(', '));
        
        // 對 m1~m8 (id 2-9) 計算得分
        for (let symbol = 2; symbol <= 9; symbol++) {
            const colCounts = Array(5).fill(0);
            
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 5; col++) {
                    if (matches[row][col]) {
                        const boardSymbol = this.board[row][col];
                        const normSymbol = this.normalizeSymbol(boardSymbol);
                        // 使用标准化后的符号进行比较，这样黄金符号也能计算得分
                        if (normSymbol === symbol || boardSymbol === 0 || boardSymbol === 34) {
                            colCounts[col]++;
                        }
                    }
                }
            }
            
            let length = 0;
            for (let col = 0; col < 5; col++) {
                if (colCounts[col] > 0) {
                    length++;
                } else {
                    break;
                }
            }
            
            if (length >= 3) {
                let ways = 1;
                const waysDetail = [];
                let explodedIndex = 0; // 爆炸列的顺序索引
                
                for (let col = 0; col < length; col++) {
                    if (explodedCols[col]) {
                        // 按爆炸顺序使用explosionValues，不是按列号
                        const explosionValue = explosionValues[explodedIndex];
                        ways *= explosionValue;
                        waysDetail.push(`列${col}:爆炸×${explosionValue}`);
                        explodedIndex++;
                    } else {
                        ways *= colCounts[col];
                        waysDetail.push(`列${col}:${colCounts[col]}个`);
                    }
                }
                console.log(`符号 ${symbol} ways计算: ${waysDetail.join(', ')} = ${ways}`);
                
                const linkIdx = Math.min(length - 3, 2);
                const symbolIdx = symbol - 2;
                const baseWin = linkpoint[linkIdx][symbolIdx];
                const symbolWin = ways * baseWin;
                
                totalWin += symbolWin;
                
                // 记录符号得分详情
                const symbolName = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8'][symbolIdx];
                winDetails.push({
                    symbol: symbolName,
                    length: length,
                    ways: ways,
                    baseWin: baseWin,
                    totalWin: symbolWin
                });
            }
        }
        
        // 如果有匹配但没有得分，输出警告
        if (totalWin === 0 && matchedSymbols.size > 0) {
            console.warn('⚠️ 警告：发现有符号匹配但总得分为0！匹配的符号:', Array.from(matchedSymbols).sort((a,b)=>a-b).join(', '));
            console.warn('这可能是因为：');
            console.warn('1. 匹配的是MY符号（18-25或26-33），但它们应该已被转换为M符号');
            console.warn('2. 匹配的是特殊符号（如C1、WILD等），这些符号不计分');
            console.warn('3. calculateWin只计算M1-M8(id 2-9)的得分');
        }
        
        return { totalWin, winDetails };
    }
    
    applyGravityAndFill(matches) {
        // 照搬 superace.html 的重力逻辑
        // 收集每列的现有符号（包括转换后的WILD），然后从底部填充，顶部补充新符号
        
        const dropIdx = Math.min(this.cascadeCount, 3);
        const gameType = this.isFreeGame ? 'FreeGame' : 'BaseGame';
        const dropWeights = this.gameData[`${gameType}Drop${this.currentGameSet}_${dropIdx + 1}`];
        
        console.log(`补充符号: ${gameType}Drop${this.currentGameSet}_${dropIdx + 1}, cascadeCount=${this.cascadeCount}`);
        
        this.newSymbolsPerCol = [];
        this.animateCells = Array(4).fill(null).map(() => Array(5).fill(false));
        this.symbolOldPositions = Array(4).fill(null).map(() => Array(5).fill(null));
        
        for (let col = 0; col < 5; col++) {
            // 收集现有符号（非null的符号，包括WILD）
            const existingSymbols = [];
            const existingRows = [];
            
            for (let row = 0; row < 4; row++) {
                if (this.board[row][col] !== null) {
                    existingSymbols.push(this.board[row][col]);
                    existingRows.push(row);
                }
            }
            
            // 检查该列是否已存在C1
            let hasC1 = false;
            for (const symbol of existingSymbols) {
                if (symbol === 1) {  // C1的ID是1
                    hasC1 = true;
                    break;
                }
            }
            
            // 计算需要补充的数量
            const needFill = 4 - existingSymbols.length;
            
            // 生成新符号
            const newSymbols = [];
            for (let i = 0; i < needFill; i++) {
                let symbolId = this.weightedChoice(dropWeights[col]);
                
                console.log(`列${col} 补充第${i+1}个符号: ID=${symbolId}, 权重配置:`, dropWeights[col].map((w, idx) => w > 0 ? `ID${idx}:${w}` : null).filter(x => x).join(', '));
                
                // 如果该列已有C1且抽到C1，改为MY1
                if (hasC1 && symbolId === 1) {
                    console.log(`  列${col}已有C1，将C1改为MY1`);
                    symbolId = 18;  // MY1
                }
                // 如果是第一个补充符号且抽到C1，标记该列已有C1
                else if (symbolId === 1) {
                    hasC1 = true;
                }
                
                newSymbols.push(symbolId);
            }
            
            console.log(`列${col} 补充完成，新符号:`, newSymbols);
            
            this.newSymbolsPerCol[col] = { count: needFill, symbols: newSymbols };
            
            // 重建该列：新符号在上，现有符号在下
            const newCol = [...newSymbols, ...existingSymbols];
            
            for (let row = 0; row < 4; row++) {
                this.board[row][col] = newCol[row];
            }
            
            // 标记动画信息
            // 新符号
            for (let row = 0; row < needFill; row++) {
                this.animateCells[row][col] = true;
                this.symbolOldPositions[row][col] = -1; // -1 表示新符号
            }
            
            // 现有符号
            for (let i = 0; i < existingSymbols.length; i++) {
                const newRow = needFill + i;
                const oldRow = existingRows[i];
                this.symbolOldPositions[newRow][col] = oldRow;
                
                if (newRow !== oldRow) {
                    this.animateCells[newRow][col] = true;
                }
            }
        }
    }
    
    async spin() {
        if (this.isPlaying) return;
        
        // 如果当前在FreeGame模式且有剩余次数，应该调用startFreeGame而不spin
        if (this.isFreeGame && this.freeGameSpinsLeft > 0) {
            this.startFreeGame();
            return;
        }
        
        this.isPlaying = true;
        this.currentWin = 0;
        // 只在BaseGame时清零并隐藏FreeGame分数
        if (!this.isFreeGame) {
            this.currentFreeGameWin = 0;
            document.getElementById('freeGameWinItem').style.display = 'none';
            // 确保移除FreeGame背景色
            document.body.classList.remove('freegame-mode');
        }
        this.cascadeCount = 0;
        this.cascadeWins = [];
        
        // 熄灭所有倍数灯
        document.querySelectorAll('.multiplier-light').forEach(light => {
            light.classList.remove('active');
        });
        
        document.getElementById('spinBtn').disabled = true;
        document.getElementById('freeGameBtn').disabled = true;
        
        // 根据 basewheel 抽选参数组 (1-5)
        const basewheel = this.gameData.basewheel;
        const selectedIndex = this.weightedChoice(basewheel);
        this.currentGameSet = selectedIndex + 1; // 转换为 1-5
        
        console.log(`使用参数组: ${this.currentGameSet}`);
        
        // Generate initial board
        this.generateInitialBoard();
        
        // 生成本次 SPIN 的 MY 映射（照搬 simulation.py）
        this.generateMyMapping();
        this.convertMySymbols();
        
        await this.renderBoard(true);
        await this.sleep(200); // 缩短等待时间
        
        // Cascade loop - 照搬 superace.html 的结构
        while (this.cascadeCount < 50) {
            // 先检查WILD1爆炸
            const explodedCols = Array(5).fill(false);
            this.checkAndTriggerWild1Explosion(explodedCols);
            
            if (explodedCols.some(v => v)) {
                // WILD1爆炸后不会引入新符号，但为了保险还是调用一次
                this.convertMySymbols();
                // await this.showExplosion(explodedCols); // 取消爆炸动画
                await this.renderBoard();
                await this.sleep(300); // 缩短等待时间
            }
            
            // 检查匹配
            const matches = this.checkMatches();
            if (!matches.some(row => row.some(v => v))) {
                break; // 没有匹配，停止
            }
            
            // 更新倍数灯（只在有消除时）
            this.updateMultiplierLights();
            
            // 高亮匹配
            await this.highlightMatches(matches);
            
            // 计算赢分
            const { totalWin, winDetails } = this.calculateWin(matches, explodedCols);
            
            let multiplier = 1;
            if (this.cascadeCount === 0) multiplier = 1;
            else if (this.cascadeCount === 1) multiplier = 2;
            else if (this.cascadeCount === 2) multiplier = 3;
            else multiplier = 5;
            
            const finalWin = totalWin * multiplier;
            this.currentWin += finalWin;
            
            this.updateUI();
            
            // 记录本次cascade的得分详情（即使得分为0也要记录，保持连锁编号连续）
            this.cascadeWins.push({
                cascade: this.cascadeCount,
                multiplier: multiplier,
                wins: winDetails,
                total: finalWin
            });
            
            // 等待玩家看清
            await this.sleep(500);
            
            // 消除符号（普通符号消除，黄金符号转换为WILD）
            await this.removeMatchedSymbols(matches);
            
            // 重力和补充（WILD会和其他符号一起下落）
            this.applyGravityAndFill(matches);
            this.convertMySymbols();
            
            await this.renderBoardWithGravity();
            await this.sleep(500);
            
            this.cascadeCount++;
        }
        
        this.totalScore += this.currentWin;
        if (this.currentWin > this.maxWin) {
            this.maxWin = this.currentWin;
        }
        
        // 检查是否触发FreeGame（BaseGame中3个或以上C1）
        if (!this.isFreeGame) {
            const c1Count = this.countC1();
            if (c1Count >= 3) {
                this.freeGameSpinsLeft += 10;
                this.isFreeGame = true; // 设置FreeGame标志
                this.currentFreeGameWin = 0; // 重置FreeGame得分
                document.getElementById('freeGameWinItem').style.display = 'flex'; // 显示FreeGame得分栏
                document.body.classList.add('freegame-mode'); // 切换背景色
                console.log(`触发FreeGame！C1数量: ${c1Count}，获得10次FreeGame`);
                this.updateFreeGameButton();
            }
        }
        
        this.logResult();
        this.updateUI();
        
        this.isPlaying = false;
        document.getElementById('spinBtn').disabled = false;
        document.getElementById('freeGameBtn').disabled = false;
    }
    
    async renderBoard(animate = false) {
        if (animate) {
            // 初始盘面：所有符号从上方掉落
            await this.renderInitialBoardWithDrop();
        } else {
            // 普通渲染：直接显示
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 5; col++) {
                    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    const img = cell.querySelector('img');
                    const symbolId = this.board[row][col];
                    const imagePath = this.symbolImages[symbolId] || this.symbolImages[0];
                    img.src = this.preloadedImages[imagePath] || imagePath;
                }
            }
        }
    }
    
    async renderInitialBoardWithDrop() {
        // 初始盘面：每列的4个符号作为一个整体从上方掉落
        for (let col = 0; col < 5; col++) {
            // 为每列创建一个容器，包含该列的所有符号
            const colCells = [];
            for (let row = 0; row < 4; row++) {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                const img = cell.querySelector('img');
                const symbolId = this.board[row][col];
                
                const imagePath = this.symbolImages[symbolId];
                img.src = this.preloadedImages[imagePath] || imagePath;
                colCells.push(img);
            }
            
            // 整列从上方开始（4个符号的高度 = 400px）
            const startTop = -400;
            
            // 设置整列的初始位置
            colCells.forEach(img => {
                img.style.position = 'relative';
                img.style.top = `${startTop}px`;
                img.style.opacity = '1';
                img.style.transition = 'none';
            });
            
            // 延迟启动动画，创建波浪效果
            const delay = col * 80; // 每列延迟 80ms
            
            setTimeout(() => {
                requestAnimationFrame(() => {
                    colCells.forEach(img => {
                        img.style.transition = 'top 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                    });
                    requestAnimationFrame(() => {
                        colCells.forEach(img => {
                            img.style.top = '0px';
                        });
                    });
                });
            }, delay);
        }
        
        // 等待所有动画完成（最后一列的延迟 + 动画时间）
        await this.sleep(320 + 700);
        
        // 清理样式
        document.querySelectorAll('.cell img').forEach(img => {
            img.style.position = '';
            img.style.top = '';
            img.style.transition = '';
            img.style.opacity = '1';
        });
    }
    
    async renderBoardWithGravity() {
        // 按列处理，让新符号作为整体掉落，现有符号单独下落
        for (let col = 0; col < 5; col++) {
            const newSymbols = [];
            const movingSymbols = [];
            const stationarySymbols = [];
            
            // 收集该列的符号并分类
            for (let row = 0; row < 4; row++) {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                const img = cell.querySelector('img');
                const oldRow = this.symbolOldPositions[row][col];
                const symbol = this.board[row][col];
                
                if (oldRow === -1) {
                    // 新符号
                    newSymbols.push({ row, img, symbol });
                } else if (oldRow !== null && oldRow !== row) {
                    // 需要移动的现有符号
                    movingSymbols.push({ row, oldRow, img, symbol });
                } else {
                    // 不需要移动的符号
                    stationarySymbols.push({ row, img, symbol });
                }
            }
            
            // 处理新符号：整体从上方掉落
            if (newSymbols.length > 0) {
                const startTop = -100 * newSymbols.length; // 整体起始位置
                
                newSymbols.forEach(({ img, symbol }) => {
                    // 先更新图片（此时还是透明的）
                    const imagePath = this.symbolImages[symbol];
                    img.src = this.preloadedImages[imagePath] || imagePath;
                    // 设置初始位置和样式
                    img.style.position = 'relative';
                    img.style.top = `${startTop}px`;
                    img.style.opacity = '0';
                    img.style.transition = 'none';
                });
            }
            
            // 处理现有符号：从原位置移动到新位置
            movingSymbols.forEach(({ row, oldRow, img, symbol }) => {
                const distance = (row - oldRow) * 100;
                // 先更新图片（如果需要）
                const imagePath = this.symbolImages[symbol];
                img.src = this.preloadedImages[imagePath] || imagePath;
                // 设置初始位置和样式
                img.style.position = 'relative';
                img.style.top = `${-distance}px`;
                img.style.opacity = '1';
                img.style.transition = 'none';
            });
            
            // 处理静止符号
            stationarySymbols.forEach(({ img, symbol }) => {
                // 更新图片
                const imagePath = this.symbolImages[symbol];
                img.src = this.preloadedImages[imagePath] || imagePath;
                // 保持原位置
                img.style.position = 'relative';
                img.style.top = '0px';
                img.style.opacity = '1';
                img.style.transition = 'none';
            });
        }
        
        // 等待一帧，确保样式生效
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        // 启用 transition 并触发动画
        for (let col = 0; col < 5; col++) {
            for (let row = 0; row < 4; row++) {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                const img = cell.querySelector('img');
                
                img.style.transition = 'top 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s';
            }
        }
        
        // 再等待一帧后触发动画
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        // 触发所有符号移动到最终位置
        document.querySelectorAll('.cell img').forEach(img => {
            img.style.top = '0px';
            img.style.opacity = '1';
        });
        
        // 等待动画完成
        await this.sleep(650);
        
        // 清理所有样式
        document.querySelectorAll('.cell img').forEach(img => {
            img.style.position = '';
            img.style.top = '';
            img.style.transition = '';
            img.style.opacity = '1';
        });
    }
    
    async highlightMatches(matches) {
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 5; col++) {
                if (matches[row][col]) {
                    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    cell.classList.add('matched');
                }
            }
        }
        
        await this.sleep(500);
        
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 5; col++) {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                cell.classList.remove('matched');
            }
        }
    }
    
    async removeMatchedSymbols(matches) {
        // 照搬 superace.html 的逻辑
        // 1. 普通符号和WILD -> 直接消除（设为null）
        // 2. 黄金符号 -> 转换为WILD，不设为null
        // 3. 同列多个黄金符号，只进行一次 WILD1 判定
        
        const symbolsToRemove = [];
        const symbolsToTransform = [];
        
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 5; col++) {
                if (matches[row][col]) {
                    const symbol = this.board[row][col];
                    
                    // 判断是否是黄金符号
                    if ((symbol >= 10 && symbol <= 17) || (symbol >= 26 && symbol <= 33)) {
                        // 黄金符号 -> 转换
                        symbolsToTransform.push({row, col, symbol});
                    } else {
                        // 普通符号和WILD -> 消除
                        symbolsToRemove.push({row, col});
                    }
                }
            }
        }
        
        // 第一步：消除普通符号（淡出动画）
        for (const pos of symbolsToRemove) {
            const cell = document.querySelector(`[data-row="${pos.row}"][data-col="${pos.col}"]`);
            const img = cell.querySelector('img');
            
            img.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
            img.style.transform = 'scale(0)';
            img.style.opacity = '0';
            
            // 标记为已消除
            this.board[pos.row][pos.col] = null;
        }
        
        // 第二步：转换黄金符号为WILD/WILD1（原地转换动画）
        // 同列多个黄金符号，只进行一次 WILD1 判定
        const gameType = this.isFreeGame ? 'FreeGame' : 'baseGame';
        const exWeights = this.gameData[`${gameType}EX${this.currentGameSet}`];
        
        // 按列分组黄金符号
        const goldenByCol = {};
        for (const pos of symbolsToTransform) {
            if (!goldenByCol[pos.col]) {
                goldenByCol[pos.col] = [];
            }
            goldenByCol[pos.col].push(pos);
        }
        
        // 对每列进行一次判定
        for (const col in goldenByCol) {
            const colNum = parseInt(col);
            const positions = goldenByCol[col];
            
            // 进行爆炸判定（整列只判定一次）
            // cascade_idx: cascade 0,1,2,3+ -> ex_weights index 1,2,3,4
            const cascadeIdx = Math.min(this.cascadeCount, 3) + 1;
            const triggerWeight = exWeights[colNum][cascadeIdx];
            const noTriggerWeight = exWeights[colNum][0];
            const result = this.weightedChoice([triggerWeight, noTriggerWeight]);
            const convertTo = result === 0 ? 34 : 0; // WILD1 或 WILD
            
            console.log(`列${colNum}有${positions.length}个黄金符号，统一转换为: ${convertTo === 34 ? 'WILD1' : 'WILD'}`);
            
            // 将该列所有黄金符号转换为相同结果
            for (const pos of positions) {
                const cell = document.querySelector(`[data-row="${pos.row}"][data-col="${pos.col}"]`);
                const img = cell.querySelector('img');
                
                // 更新board（重要：不设为null，而是设为WILD/WILD1）
                this.board[pos.row][pos.col] = convertTo;
                
                console.log(`  黄金符号转换: [${pos.row}][${pos.col}] -> ${convertTo === 34 ? 'WILD1' : 'WILD'}`);
                
                // 转换动画：放大
                img.style.transition = 'transform 0.4s ease-out';
                img.style.transform = 'scale(1.2)';
                
                // 更新图片
                const imagePath = this.symbolImages[convertTo];
                img.src = this.preloadedImages[imagePath] || imagePath;
                
                // 恢复大小
                setTimeout(() => {
                    img.style.transform = 'scale(1)';
                }, 400);
            }
        }
        
        // 等待动画完成
        await this.sleep(450);
        
        // 完整清理所有样式，为下一个动画做准备
        document.querySelectorAll('.cell img').forEach(img => {
            img.style.transition = '';
            img.style.transform = '';
            img.style.opacity = '';
        });
    }
    
    
    async showExplosion(explodedCols) {
        const overlay = document.getElementById('explosionOverlay');
        
        for (let col = 0; col < 5; col++) {
            if (explodedCols[col]) {
                const explosion = document.createElement('div');
                explosion.className = 'explosion-effect';
                explosion.style.left = `${col * 108 + 15}px`;
                explosion.style.width = '100px';
                overlay.appendChild(explosion);
                
                setTimeout(() => explosion.remove(), 1000);
            }
        }
        
        await this.sleep(1000);
    }
    
    updateUI() {
        document.getElementById('totalScore').textContent = this.totalScore.toLocaleString();
        document.getElementById('currentWin').textContent = this.currentWin.toLocaleString();
        document.getElementById('cascadeCount').textContent = this.cascadeCount;
        document.getElementById('totalSpins').textContent = this.totalSpins.toLocaleString();
        document.getElementById('maxWin').textContent = this.maxWin.toLocaleString();
        
        // 更新FreeGame得分
        if (this.isFreeGame) {
            document.getElementById('freeGameWin').textContent = this.currentFreeGameWin.toLocaleString();
        }
        
        const rtp = this.totalSpins > 0 ? (this.totalScore / this.totalSpins * 100).toFixed(2) : '0.00';
        document.getElementById('rtp').textContent = `${rtp}%`;
        
        // 更新cascade得分详情
        this.updateCascadeDetails();
    }
    
    updateCascadeDetails() {
        const container = document.getElementById('cascadeDetails');
        if (!container) return;
        
        if (this.cascadeWins.length === 0) {
            container.innerHTML = '<div class="no-wins">無得分</div>';
            return;
        }
        
        let html = '';
        this.cascadeWins.forEach(cascadeData => {
            html += `<div class="cascade-section">`;
            html += `<div class="cascade-header">連鎖 ${cascadeData.cascade} (×${cascadeData.multiplier} = ${cascadeData.total.toLocaleString()})</div>`;
            html += `<div class="symbol-wins">`;
            if (cascadeData.wins.length === 0) {
                html += `<div class="symbol-win"><span class="symbol-detail">無符號得分</span></div>`;
            } else {
                cascadeData.wins.forEach(win => {
                    html += `<div class="symbol-win">`;
                    html += `<span class="symbol-name">${win.symbol}</span>`;
                    html += `<span class="symbol-detail">${win.length}連 × ${win.ways}ways × ${win.baseWin} = <strong>${win.totalWin.toLocaleString()}</strong></span>`;
                    html += `</div>`;
                });
            }
            html += `</div></div>`;
        });
        
        container.innerHTML = html;
    }
    
    updateMultiplierLights() {
        // 单独更新倍数灯
        let multiplier = 1;
        
        if (this.isFreeGame) {
            // FreeGame倍数：2x, 4x, 6x, 10x
            if (this.cascadeCount === 0) multiplier = 2;
            else if (this.cascadeCount === 1) multiplier = 4;
            else if (this.cascadeCount === 2) multiplier = 6;
            else multiplier = 10;
            
            // 更新灯泡显示文字为FreeGame倍数
            const lights = document.querySelectorAll('.multiplier-light');
            const freeGameMultipliers = [2, 4, 6, 10];
            lights.forEach((light, index) => {
                const label = light.querySelector('.light-label');
                if (label) {
                    label.textContent = `×${freeGameMultipliers[index]}`;
                }
                light.dataset.multiplier = freeGameMultipliers[index];
            });
        } else {
            // BaseGame倍数：1x, 2x, 3x, 5x
            if (this.cascadeCount === 0) multiplier = 1;
            else if (this.cascadeCount === 1) multiplier = 2;
            else if (this.cascadeCount === 2) multiplier = 3;
            else multiplier = 5;
            
            // 恢复灯泡显示文字为BaseGame倍数
            const lights = document.querySelectorAll('.multiplier-light');
            const baseGameMultipliers = [1, 2, 3, 5];
            lights.forEach((light, index) => {
                const label = light.querySelector('.light-label');
                if (label) {
                    label.textContent = `×${baseGameMultipliers[index]}`;
                }
                light.dataset.multiplier = baseGameMultipliers[index];
            });
        }
        
        document.querySelectorAll('.multiplier-light').forEach(light => {
            const lightMultiplier = parseInt(light.dataset.multiplier);
            if (lightMultiplier === multiplier) {
                light.classList.add('active');
            } else {
                light.classList.remove('active');
            }
        });
    }
    
    logResult() {
        const log = document.getElementById('gameLog');
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        
        if (this.currentWin >= 1000) {
            entry.classList.add('mega-win');
            entry.textContent = `🎉 局 #${this.totalSpins}: 超大獎 ${this.currentWin} 分! (${this.cascadeCount}連鎖)`;
        } else if (this.currentWin >= 200) {
            entry.classList.add('big-win');
            entry.textContent = `⭐ 局 #${this.totalSpins}: 大獎 ${this.currentWin} 分! (${this.cascadeCount}連鎖)`;
        } else if (this.currentWin > 0) {
            entry.classList.add('win');
            entry.textContent = `局 #${this.totalSpins}: 贏得 ${this.currentWin} 分 (${this.cascadeCount}連鎖)`;
        } else {
            entry.textContent = `局 #${this.totalSpins}: 未中獎`;
        }
        
        log.insertBefore(entry, log.firstChild);
        
        // Keep only last 50 entries
        while (log.children.length > 50) {
            log.removeChild(log.lastChild);
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    const game = new SugarBangBang();
});
