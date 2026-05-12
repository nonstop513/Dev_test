#%%
import numpy as np
import json
from numba import njit
import time

# 載入數據
def load_data(json_path='data.js'):
    """載入 data.js 中的遊戲參數"""
    with open(json_path, 'r', encoding='utf-8') as f:
        content = f.read()
        # 移除 "const data = " 和最後的 ";"
        json_str = content.replace('const data = ', '').rstrip(';\n')
        data = json.loads(json_str)
    
    # 轉換為 numpy 陣列
    game_data = {}
    game_data['linkpoint'] = np.array(data['linkpoint'], dtype=np.int32)
    game_data['basewheel'] = np.array(data['basewheel'], dtype=np.int32)
    game_data['Freewheel'] = np.array(data['Freewheel'], dtype=np.int32)
    game_data['Superwheel'] = np.array(data['Superwheel'], dtype=np.int32)
    
    # 載入 6 套 BaseGame 資料
    for i in range(1, 7):
        game_data[f'baseGameSymbol{i}'] = np.array(data[f'baseGameSymbol{i}'], dtype=np.int32)
        game_data[f'baseGameSymbolWeight{i}'] = np.array(data[f'baseGameSymbolWeight{i}'], dtype=np.int32)
        game_data[f'baseGameMY{i}'] = np.array(data[f'baseGameMY{i}'], dtype=np.int32)
        game_data[f'baseGameEX{i}'] = np.array(data[f'baseGameEX{i}'], dtype=np.int32)
        
        # 載入 BaseGameDrop (4 個消除階段)
        for j in range(1, 5):
            game_data[f'BaseGameDrop{i}_{j}'] = np.array(data[f'BaseGameDrop{i}_{j}'], dtype=np.int32)
    
    # 載入 6 套 FreeGame 資料
    for i in range(1, 7):
        game_data[f'FreeGameSymbol{i}'] = np.array(data[f'FreeGameSymbol{i}'], dtype=np.int32)
        game_data[f'FreeGameSymbolWeight{i}'] = np.array(data[f'FreeGameSymbolWeight{i}'], dtype=np.int32)
        game_data[f'FreeGameMY{i}'] = np.array(data[f'FreeGameMY{i}'], dtype=np.int32)
        game_data[f'FreeGameEX{i}'] = np.array(data[f'FreeGameEX{i}'], dtype=np.int32)
        
        # 載入 FreeGameDrop (4 個消除階段)
        for j in range(1, 5):
            game_data[f'FreeGameDrop{i}_{j}'] = np.array(data[f'FreeGameDrop{i}_{j}'], dtype=np.int32)
    
    # 載入 6 套 SuperFreeGame 資料
    for i in range(1, 7):
        game_data[f'SuperFreeGameSymbol{i}'] = np.array(data[f'SuperFreeGameSymbol{i}'], dtype=np.int32)
        game_data[f'SuperFreeGameSymbolWeight{i}'] = np.array(data[f'SuperFreeGameSymbolWeight{i}'], dtype=np.int32)
        game_data[f'SuperFreeGameMY{i}'] = np.array(data[f'SuperFreeGameMY{i}'], dtype=np.int32)
        game_data[f'SuperFreeGameEX{i}'] = np.array(data[f'SuperFreeGameEX{i}'], dtype=np.int32)
        
        # 載入 SuperFreeGameDrop (4 個消除階段)
        for j in range(1, 5):
            game_data[f'SuperFreeGameDrop{i}_{j}'] = np.array(data[f'SuperFreeGameDrop{i}_{j}'], dtype=np.int32)
    
    return game_data

# Symbol ID 定義
# 0: wild
# 1: 特殊c1
# 2-9: m1~m8
# 10-17: 黃金m1~m8
# 18-25: my1~my8
# 26-33: 黃金my1~my8

@njit
def weighted_choice(weights):
    """使用權重進行隨機抽選，返回索引"""
    total = np.sum(weights)
    if total == 0:
        return 0
    r = np.random.randint(0, total)
    cumsum = 0
    for i in range(len(weights)):
        cumsum += weights[i]
        if r < cumsum:
            return i
    return len(weights) - 1

@njit
def generate_initial_board(symbols, weights):
    """
    生成初始 4x5 版面
    symbols: [5][150] - 5列的符號帶
    weights: [5][150] - 5列的權重
    返回: [4][5] - 4行5列的版面
    """
    board = np.zeros((4, 5), dtype=np.int32)
    
    for col in range(5):
        # 根據權重選擇起始位置
        start_pos = weighted_choice(weights[col])
        reel_len = len(symbols[col])
        
        # 從起始位置向下取 4 個符號（循環）
        for row in range(4):
            board[row, col] = symbols[col][(start_pos + row) % reel_len]
    
    return board

@njit
def normalize_symbol(symbol):
    """
    將符號標準化：黃金版本轉為對應的普通版本
    M1~M8: 2-9 (保持不變)
    黃金M1~M8: 10-17 -> 2-9
    MY1~MY8: 18-25 (保持不變)
    黃金MY1~MY8: 26-33 -> 18-25
    WILD/C1/WILD1: 保持不變
    """
    if 10 <= symbol <= 17:  # 黃金M1~M8 -> M1~M8
        return symbol - 8
    elif 26 <= symbol <= 33:  # 黃金MY1~MY8 -> MY1~MY8
        return symbol - 8
    else:
        return symbol

@njit
def check_matches(board):
    """
    檢查 ways game 的消除匹配
    黃金符號和普通符號可以混合消除
    C1 是特殊符號，不參與消除
    返回: matches - [4][5] bool array，True 表示該位置參與消除
    """
    matches = np.zeros((4, 5), dtype=np.bool_)
    
    # 對每個非 wild 符號檢查 ways 連線
    # 只檢查普通版本的符號 (M1~M8: 2-9, MY1~MY8: 18-25)
    for symbol in range(2, 34):  # 從2開始，跳過C1
        if symbol == 0 or symbol == 34:  # 跳過 WILD 和 WILD1
            continue
        if 10 <= symbol <= 17:  # 跳過黃金M，已包含在普通 M 中
            continue
        if 26 <= symbol <= 33:  # 跳過黃金MY，已包含在普通 MY 中
            continue
        
        # 統計每列有多少個該符號（包括黃金版、wild 和 WILD1）
        col_counts = np.zeros(5, dtype=np.int32)
        
        for row in range(4):
            for col in range(5):
                board_symbol = board[row, col]
                norm_symbol = normalize_symbol(board_symbol)
                # wild (0) 和 WILD1 (34) 都可以替代任何符號
                if norm_symbol == symbol or board_symbol == 0 or board_symbol == 34:
                    col_counts[col] += 1
        
        # 從左到右檢查連續有該符號的列數
        length = 0
        for col in range(5):
            if col_counts[col] > 0:
                length += 1
            else:
                break
        
        # 至少3連才消除
        if length >= 3:
            # 標記該符號、黃金版本和 wild 在前 length 列的所有位置
            for row in range(4):
                for col in range(length):
                    board_symbol = board[row, col]
                    norm_symbol = normalize_symbol(board_symbol)
                    if norm_symbol == symbol or board_symbol == 0 or board_symbol == 34:
                        matches[row, col] = True
    
    return matches

@njit
def calculate_win(board, matches, linkpoint, exploded_cols):
    """
    計算 ways game 的得分
    黃金符號和普通符號混合計算
    linkpoint: [3][8] - linkpoint[連線長度-3][symbol_id-2]
    exploded_cols: [5] bool array - 哪些列觸發了黃金爆炸
    返回: 總得分
    """
    # 黃金爆炸列的固定 ways 值 [5,4,4,4,5]
    explosion_values = np.array([5, 4, 4, 4, 5], dtype=np.int32)
    
    total_win = 0
    
    # 對 m1~m8 (id 2-9) 計算得分
    for symbol in range(2, 10):
        # 統計每列該符號的數量（包括黃金版、wild和WILD1）
        col_counts = np.zeros(5, dtype=np.int32)
        
        for row in range(4):
            for col in range(5):
                if matches[row, col]:
                    board_symbol = board[row, col]
                    norm_symbol = normalize_symbol(board_symbol)
                    # wild (0) 和 WILD1 (34) 都可以替代任何符號
                    if norm_symbol == symbol or board_symbol == 0 or board_symbol == 34:
                        col_counts[col] += 1
        
        # 檢查從左到右連續有該符號的列數
        length = 0
        for col in range(5):
            if col_counts[col] > 0:
                length += 1
            else:
                break
        
        # 至少3連才計分
        if length >= 3:
            # 計算 ways 數
            # 如果該列觸發了爆炸，直接使用固定值；否則使用實際符號數量
            ways = 1
            for col in range(length):
                if exploded_cols[col]:
                    ways *= explosion_values[col]  # 爆炸列使用固定值
                else:
                    ways *= col_counts[col]  # 正常列使用實際數量
            
            # 查表計分
            link_idx = min(length - 3, 2)  # 3,4,5+ 連
            symbol_idx = symbol - 2  # m1~m8 -> 0~7
            base_win = linkpoint[link_idx, symbol_idx]
            
            total_win += ways * base_win
    
    return total_win

@njit
def calculate_win_freegame(board, matches, linkpoint, exploded_cols):
    """
    計算 ways game 的得分 (FreeGame版本)
    黃金符號和普通符號混合計算
    linkpoint: [3][8] - linkpoint[連線長度-3][symbol_id-2]
    exploded_cols: [5] bool array - 哪些列觸發了黃金爆炸
    FreeGame規則: 爆炸列根據展開數量累加計算 [5,6,8,10,15]
    返回: 總得分
    """
    # 統計有多少列觸發了爆炸
    explosion_count = 0
    for col in range(5):
        if exploded_cols[col]:
            explosion_count += 1
    
    # FreeGame爆炸列的累計值 [5,6,8,10,15]
    # 第1列展開=5, 第2列展開=6, 第3列展開=8, 第4列展開=10, 第5列展開=15
    explosion_cumulative_values = np.array([5, 6, 8, 10, 15], dtype=np.int32)
    
    total_win = 0
    
    # 對 m1~m8 (id 2-9) 計算得分
    for symbol in range(2, 10):
        # 統計每列該符號的數量（包括黃金版、wild和WILD1）
        col_counts = np.zeros(5, dtype=np.int32)
        
        for row in range(4):
            for col in range(5):
                if matches[row, col]:
                    board_symbol = board[row, col]
                    norm_symbol = normalize_symbol(board_symbol)
                    # wild (0) 和 WILD1 (34) 都可以替代任何符號
                    if norm_symbol == symbol or board_symbol == 0 or board_symbol == 34:
                        col_counts[col] += 1
        
        # 檢查從左到右連續有該符號的列數
        length = 0
        for col in range(5):
            if col_counts[col] > 0:
                length += 1
            else:
                break
        
        # 至少3連才計分
        if length >= 3:
            # 計算 ways 數
            ways = 1
            exploded_in_match = 0  # 該次匹配中有多少爆炸列參與
            
            for col in range(length):
                if exploded_cols[col]:
                    # 爆炸列：使用累計值
                    ways *= explosion_cumulative_values[exploded_in_match]
                    exploded_in_match += 1
                else:
                    # 正常列：使用實際數量
                    ways *= col_counts[col]
            
            # 查表計分
            link_idx = min(length - 3, 2)  # 3,4,5+ 連
            symbol_idx = symbol - 2  # m1~m8 -> 0~7
            base_win = linkpoint[link_idx, symbol_idx]
            
            total_win += ways * base_win
    
    return total_win

@njit
def trigger_wild1_explosion(board):
    """
    將版面上的 WILD1 標記轉換為整列爆炸
    WILD1 (ID 34) 已在黃金符號消除時判定觸發
    
    返回: board, exploded_cols (哪些列觸發了爆炸)
    """
    exploded_cols = np.zeros(5, dtype=np.bool_)
    
    # 檢查每一列是否有 WILD1
    for col in range(5):
        has_wild1 = False
        for row in range(4):
            if board[row, col] == 34:  # WILD1
                has_wild1 = True
                break
        
        if has_wild1:
            # 該列觸發爆炸，將整列除了C1以外的符號變為WILD
            exploded_cols[col] = True
            for row in range(4):
                if board[row, col] != 1:  # C1的ID是1
                    board[row, col] = 0  # 變為WILD
    
    return board, exploded_cols

@njit
def apply_gravity_and_fill(board, matches, drop_weights, cascade_count, ex_weights):
    """
    應用重力並填充新符號
    在黃金符號消除時判定是否觸發爆炸，決定放置 WILD 或 WILD1
    
    drop_weights: [5][34] - 5列的補充符號權重
    cascade_count: 當前是第幾次消除 (0=第一次, 1=第二次, 2=第三次, 3+=第四次以上)
    ex_weights: [5][5] - ex_weights[col] = [不觸發權重, 第0次消除, 第1次消除, 第2次消除, 第3+次消除]
    返回: 新版面
    """
    wild_positions = np.zeros((4, 5), dtype=np.int32)  # 普通WILD
    wild1_positions = np.zeros((4, 5), dtype=np.int32)  # 爆炸WILD1
    
    # 根據當前是第幾次消除選擇權重索引
    cascade_idx = min(cascade_count, 3) + 1  # cascade 0,1,2,3+ -> ex_weights index 1,2,3,4
    
    # 檢查每一列是否有黃金符號消除，同列只判定一次
    for col in range(5):
        # 檢查該列是否有黃金符號被消除
        has_golden = False
        for row in range(4):
            if matches[row, col]:
                symbol = board[row, col]
                if (10 <= symbol <= 17) or (26 <= symbol <= 33):
                    has_golden = True
                    break
        
        # 如果該列有黃金符號，進行一次判定
        if has_golden:
            trigger_weight = ex_weights[col, cascade_idx]
            no_trigger_weight = ex_weights[col, 0]
            weights = np.array([trigger_weight, no_trigger_weight], dtype=np.int32)
            result = weighted_choice(weights)
            
            # 將該列所有被消除的黃金符號都套用相同結果
            for row in range(4):
                if matches[row, col]:
                    symbol = board[row, col]
                    if (10 <= symbol <= 17) or (26 <= symbol <= 33):
                        if result == 0:  # 觸發爆炸
                            wild1_positions[row, col] = 1  # 標記為WILD1
                        else:  # 不觸發
                            wild_positions[row, col] = 1  # 標記為普通WILD
    
    # 對每一列進行重力下落
    for col in range(5):
        # 收集未消除的符號
        remaining = []
        for row in range(4):
            if not matches[row, col]:
                remaining.append(board[row, col])
        
        # 檢查該列是否已存在C1
        has_c1 = False
        for symbol in remaining:
            if symbol == 1:  # C1
                has_c1 = True
                break
        
        # 計算需要補充的符號數量
        need_fill = 4 - len(remaining)
        
        # 從 drop_weights 抽選新符號
        new_symbols = []
        for _ in range(need_fill):
            symbol_id = weighted_choice(drop_weights[col])
            
            # 如果該列已有C1且抽到C1，改為MY1
            if has_c1 and symbol_id == 1:
                symbol_id = 18  # MY1
            # 如果是第一個補充符號且抽到C1，標記該列已有C1
            elif symbol_id == 1:
                has_c1 = True
            
            new_symbols.append(symbol_id)
        
        # 重新排列：新符號在上，剩餘符號在下
        new_col = new_symbols + remaining
        for row in range(4):
            board[row, col] = new_col[row]
    
    # 在黃金符號消除的位置根據判定放置WILD或WILD1標記
    for row in range(4):
        for col in range(5):
            if wild1_positions[row, col] == 1:
                board[row, col] = 34  # WILD1（下一輪觸發爆炸）
            elif wild_positions[row, col] == 1:
                board[row, col] = 0  # 普通WILD（下一輪參與消除）
    
    return board

@njit
def generate_my_mapping(my_weights):
    """
    生成一次SPIN使用的MY1~MY8到M1~M8的映射
    一次SPIN內所有MY符號使用相同映射
    my_weights: [8] - 抽選權重
    返回: my_to_m[8] - MY1~MY8對應的M符號索引(0-7)
    """
    my_to_m = np.zeros(8, dtype=np.int32)  # MY1~MY8 -> M1~M8 索引
    available = np.ones(8, dtype=np.bool_)  # M1~M8 是否可用
    
    # 從 MY1 開始依序抽選
    for my_idx in range(8):
        # 計算可用 M 符號的權重
        valid_weights = my_weights.copy()
        for m_idx in range(8):
            if not available[m_idx]:
                valid_weights[m_idx] = 0
        
        # 抽選一個可用的 M 符號
        m_idx = weighted_choice(valid_weights)
        my_to_m[my_idx] = m_idx
        available[m_idx] = False
    
    return my_to_m

@njit
def convert_my_symbols(board, my_to_m):
    """
    使用預定義的映射轉換 my 符號為 m 符號
    my_to_m: [8] - MY1~MY8對應的M符號索引(0-7)
    """
    # 轉換版面上的 MY 符號
    for row in range(4):
        for col in range(5):
            symbol = board[row, col]
            if 18 <= symbol <= 25:  # my1~my8
                my_idx = symbol - 18
                m_idx = my_to_m[my_idx]
                board[row, col] = 2 + m_idx  # 轉換為 M1~M8
            elif 26 <= symbol <= 33:  # 黃金my1~my8
                my_idx = symbol - 26
                m_idx = my_to_m[my_idx]
                board[row, col] = 10 + m_idx  # 轉換為黃金M1~M8
    
    return board

@njit
def count_c1(board):
    """
    統計版面上的C1數量
    返回: C1的數量
    """
    count = 0
    for row in range(4):
        for col in range(5):
            if board[row, col] == 1:  # C1
                count += 1
    return count

@njit
def play_one_spin(symbols, weights, drop_weights_list, linkpoint, my_weights, ex_weights):
    """
    進行一次遊戲旋轉
    drop_weights_list: [4][5][34] - 4個消除階段的補充權重
    ex_weights: [5][5] - ex_weights[col] = [不觸發權重, 第0次消除, 第1次消除, 第2次消除, 第3+次消除]
    返回: total_win, cascade_count, c1_count
    """
    # 生成初始版面
    board = generate_initial_board(symbols, weights)
    
    # 生成本次SPIN的MY符號映射（整個SPIN使用同一組映射）
    my_to_m = generate_my_mapping(my_weights)
    
    # 轉換初始版面的 my 符號
    board = convert_my_symbols(board, my_to_m)
    
    total_win = 0
    cascade_count = 0
    max_cascades = 50  # 防止無限循環
    
    while cascade_count < max_cascades:
        # 檢查是否有 WILD1 標記，觸發整列爆炸
        board, exploded_cols = trigger_wild1_explosion(board)
        
        # 檢查消除
        matches = check_matches(board)
        
        if not np.any(matches):
            break
        
        # 計算得分（傳遞 exploded_cols 以應用爆炸固定值）
        win = calculate_win(board, matches, linkpoint, exploded_cols)
        
        # 根據消除次數乘倍：第1次×1, 第2次×2, 第3次×3, 第4次和以後×5
        if cascade_count == 0:
            multiplier = 1
        elif cascade_count == 1:
            multiplier = 2
        elif cascade_count == 2:
            multiplier = 3
        else:
            multiplier = 5
        
        total_win += win * multiplier
        
        # 選擇對應的 drop weights
        drop_idx = min(cascade_count, 3)  # 0,1,2,3+
        drop_weights = drop_weights_list[drop_idx]
        
        # 應用重力和填充（黃金符號消除時判定並放置WILD或WILD1）
        board = apply_gravity_and_fill(board, matches, drop_weights, cascade_count, ex_weights)
        
        # 轉換新補充的 my 符號（使用相同的映射）
        board = convert_my_symbols(board, my_to_m)
        
        cascade_count += 1
    
    # 統計最終版面上的 c1 數量（符號 ID = 1）
    c1_count = np.sum(board == 1)
    
    return total_win, cascade_count, c1_count

@njit
def play_one_spin_with_board(symbols, weights, drop_weights_list, linkpoint, my_weights, ex_weights):
    """
    進行一次遊戲旋轉，並返回最終版面
    drop_weights_list: [4][5][34] - 4個消除階段的補充權重
    ex_weights: [5][5] - ex_weights[col] = [不觸發權重, 第0次消除, 第1次消除, 第2次消除, 第3+次消除]
    返回: total_win, cascade_count, final_board
    """
    # 生成初始版面
    board = generate_initial_board(symbols, weights)
    
    # 生成本次SPIN的MY符號映射（整個SPIN使用同一組映射）
    my_to_m = generate_my_mapping(my_weights)
    
    # 轉換初始版面的 my 符號
    board = convert_my_symbols(board, my_to_m)
    
    total_win = 0
    cascade_count = 0
    max_cascades = 50  # 防止無限循環
    
    while cascade_count < max_cascades:
        # 檢查是否有 WILD1 標記，觸發整列爆炸
        board, exploded_cols = trigger_wild1_explosion(board)
        
        # 檢查消除
        matches = check_matches(board)
        
        if not np.any(matches):
            break
        
        # 計算得分（傳遞 exploded_cols 以應用爆炸固定值）
        win = calculate_win(board, matches, linkpoint, exploded_cols)
        
        # 根據消除次數乘倍：第1次×1, 第2次×2, 第3次×3, 第4次和以後×5
        if cascade_count == 0:
            multiplier = 1
        elif cascade_count == 1:
            multiplier = 2
        elif cascade_count == 2:
            multiplier = 3
        else:
            multiplier = 5
        
        total_win += win * multiplier
        
        # 選擇對應的 drop weights
        drop_idx = min(cascade_count, 3)  # 0,1,2,3+
        drop_weights = drop_weights_list[drop_idx]
        
        # 應用重力和填充（黃金符號消除時判定並放置WILD或WILD1）
        board = apply_gravity_and_fill(board, matches, drop_weights, cascade_count, ex_weights)
        
        # 轉換新補充的 my 符號（使用相同的映射）
        board = convert_my_symbols(board, my_to_m)
        
        cascade_count += 1
    
    return total_win, cascade_count, board

@njit
def play_one_spin_freegame(symbols, weights, drop_weights_list, linkpoint, my_weights, ex_weights, cascade_multipliers):
    """
    進行一次FreeGame旋轉，並返回最終版面
    FreeGame規則：
    - 消除倍數: 可自定義 (第0,1,2,3+次消除)
    - 爆炸列計算: 根據展開數量累加 [5,6,8,10,15]
    
    drop_weights_list: [4][5][34] - 4個消除階段的補充權重
    ex_weights: [5][5] - ex_weights[col] = [不觸發權重, 第0次消除, 第1次消除, 第2次消除, 第3+次消除]
    cascade_multipliers: [4] - 消除倍數 [第0次, 第1次, 第2次, 第3+次]
    返回: total_win, cascade_count, final_board
    """
    # 生成初始版面
    board = generate_initial_board(symbols, weights)
    
    # 生成本次SPIN的MY符號映射（整個SPIN使用同一組映射）
    my_to_m = generate_my_mapping(my_weights)
    
    # 轉換初始版面的 my 符號
    board = convert_my_symbols(board, my_to_m)
    
    total_win = 0
    cascade_count = 0
    max_cascades = 50  # 防止無限循環
    
    while cascade_count < max_cascades:
        # 檢查是否有 WILD1 標記，觸發整列爆炸
        board, exploded_cols = trigger_wild1_explosion(board)
        
        # 檢查消除
        matches = check_matches(board)
        
        if not np.any(matches):
            break
        
        # 計算得分（使用FreeGame版本的計算）
        win = calculate_win_freegame(board, matches, linkpoint, exploded_cols)
        
        # FreeGame消除倍數：使用傳入的倍數陣列
        multiplier_idx = min(cascade_count, 3)  # 0,1,2,3+
        multiplier = cascade_multipliers[multiplier_idx]
        
        total_win += win * multiplier
        
        # 選擇對應的 drop weights
        drop_idx = min(cascade_count, 3)  # 0,1,2,3+
        drop_weights = drop_weights_list[drop_idx]
        
        # 應用重力和填充（黃金符號消除時判定並放置WILD或WILD1）
        board = apply_gravity_and_fill(board, matches, drop_weights, cascade_count, ex_weights)
        
        # 轉換新補充的 my 符號（使用相同的映射）
        board = convert_my_symbols(board, my_to_m)
        
        cascade_count += 1
    
    return total_win, cascade_count, board

@njit
def run_simulation(num_spins, basewheel, all_symbols, all_weights, all_drop_weights_list, 
                   linkpoint, all_my_weights, all_ex_weights):
    """
    運行 N 次模擬，每次spin根據basewheel抽選參數集
    all_symbols: [6][5][150] - 6套參數集
    all_weights: [6][5][150]
    all_drop_weights_list: [6][4][5][34]
    all_my_weights: [6][8]
    all_ex_weights: [6][5][5]
    返回: wins, cascades, c1_counts
    """
    wins = np.zeros(num_spins, dtype=np.int32)
    cascades = np.zeros(num_spins, dtype=np.int32)
    c1_counts = np.zeros(num_spins, dtype=np.int32)
    
    # 預先抽選n次basewheel，避免在循環中重複調用
    game_set_indices = np.zeros(num_spins, dtype=np.int32)
    for i in range(num_spins):
        game_set_indices[i] = weighted_choice(basewheel)
    
    # 執行模擬
    for i in range(num_spins):
        game_set_idx = game_set_indices[i]
        
        symbols = all_symbols[game_set_idx]
        weights = all_weights[game_set_idx]
        drop_weights_list = all_drop_weights_list[game_set_idx]
        my_weights = all_my_weights[game_set_idx]
        ex_weights = all_ex_weights[game_set_idx]
        
        win, cascade, c1_count = play_one_spin(symbols, weights, drop_weights_list, 
                                               linkpoint, my_weights, ex_weights)
        wins[i] = win
        cascades[i] = cascade
        c1_counts[i] = c1_count
    
    return wins, cascades, c1_counts

@njit
def play_custom_board(initial_board, drop_weights_list, linkpoint, my_weights, ex_weights):
    """
    使用自定義初始版面進行遊戲
    initial_board: [4][5] 初始版面
    ex_weights: [5][5] - ex_weights[col] = [不觸發權重, 第0次消除, 第1次消除, 第2次消除, 第3+次消除]
    返回: total_win, cascade_count
    """
    board = initial_board.copy()
    
    # 生成本次遊戲的MY符號映射（整個遊戲使用同一組映射）
    my_to_m = generate_my_mapping(my_weights)
    
    # 轉換初始版面的 my 符號
    board = convert_my_symbols(board, my_to_m)
    
    total_win = 0
    cascade_count = 0
    max_cascades = 50
    
    while cascade_count < max_cascades:
        # 檢查是否有 WILD1 標記，觸發整列爆炸
        board, exploded_cols = trigger_wild1_explosion(board)
        
        # 檢查消除
        matches = check_matches(board)
        
        if not np.any(matches):
            break
        
        # 計算得分（傳遞 exploded_cols 以應用爆炸固定值）
        win = calculate_win(board, matches, linkpoint, exploded_cols)
        
        # 根據消除次數乘倍：第1次×1, 第2次×2, 第3次×3, 第4次和以後×5
        if cascade_count == 0:
            multiplier = 1
        elif cascade_count == 1:
            multiplier = 2
        elif cascade_count == 2:
            multiplier = 3
        else:
            multiplier = 5
        
        total_win += win * multiplier
        
        # 選擇對應的 drop weights
        drop_idx = min(cascade_count, 3)
        drop_weights = drop_weights_list[drop_idx]
        
        # 應用重力和填充（黃金符號消除時判定並放置WILD或WILD1）
        board = apply_gravity_and_fill(board, matches, drop_weights, cascade_count, ex_weights)
        
        # 轉換新補充的 my 符號（使用相同的映射）
        board = convert_my_symbols(board, my_to_m)
        
        cascade_count += 1
    
    return total_win, cascade_count

# 全局變量用於緩存數據
_cached_data = None

def _get_game_data():
    """獲取或緩存遊戲數據"""
    global _cached_data
    if _cached_data is None:
        _cached_data = load_data()
    return _cached_data

def basegame(n, game_set=None, verbose=True):
    """
    執行 n 次 base game 模擬
    
    參數:
        n: 模擬次數
        game_set: 指定使用哪一套資料 (1-6)，None 則每次spin根據 basewheel 隨機選擇
        verbose: 是否顯示統計資訊
    
    返回:
        wins: numpy array，長度為 n 的向量，代表每次的總得分
    """
    data = _get_game_data()
    linkpoint = data['linkpoint']
    
    if game_set is not None:
        # 指定參數集，所有spin使用同一套
        symbols = data[f'baseGameSymbol{game_set}']
        weights = data[f'baseGameSymbolWeight{game_set}']
        my_weights = data[f'baseGameMY{game_set}']
        ex_weights = data[f'baseGameEX{game_set}']
        
        drop_weights_list = np.zeros((4, 5, 34), dtype=np.int32)
        for i in range(4):
            drop_weights_list[i] = data[f'BaseGameDrop{game_set}_{i+1}']
        
        # 將單套參數擴展為6套格式，但basewheel只有指定的一套有權重
        all_symbols = np.zeros((6, 5, 150), dtype=np.int32)
        all_weights = np.zeros((6, 5, 150), dtype=np.int32)
        all_drop_weights_list = np.zeros((6, 4, 5, 34), dtype=np.int32)
        all_my_weights = np.zeros((6, 8), dtype=np.int32)
        all_ex_weights = np.zeros((6, 5, 5), dtype=np.int32)
        
        all_symbols[game_set-1] = symbols
        all_weights[game_set-1] = weights
        all_drop_weights_list[game_set-1] = drop_weights_list
        all_my_weights[game_set-1] = my_weights
        all_ex_weights[game_set-1] = ex_weights
        
        # basewheel只指向指定的參數集
        basewheel = np.zeros(6, dtype=np.int32)
        basewheel[game_set-1] = 1
        
        if verbose:
            print(f"執行 {n:,} 次 base game 模擬 (資料集 {game_set})...")
    else:
        # 每次spin根擺basewheel抽選，準備所有6套參數
        all_symbols = np.zeros((6, 5, 150), dtype=np.int32)
        all_weights = np.zeros((6, 5, 150), dtype=np.int32)
        all_drop_weights_list = np.zeros((6, 4, 5, 34), dtype=np.int32)
        all_my_weights = np.zeros((6, 8), dtype=np.int32)
        all_ex_weights = np.zeros((6, 5, 5), dtype=np.int32)
        
        for game_idx in range(6):
            game_num = game_idx + 1
            all_symbols[game_idx] = data[f'baseGameSymbol{game_num}']
            all_weights[game_idx] = data[f'baseGameSymbolWeight{game_num}']
            all_my_weights[game_idx] = data[f'baseGameMY{game_num}']
            all_ex_weights[game_idx] = data[f'baseGameEX{game_num}']
            
            for i in range(4):
                all_drop_weights_list[game_idx][i] = data[f'BaseGameDrop{game_num}_{i+1}']
        
        basewheel = data['basewheel']
        
        if verbose:
            print(f"執行 {n:,} 次 base game 模擬 (每次spin根擺basewheel抽選)...")
    
    if verbose:
        start_time = time.time()
    
    wins, cascades, c1_counts = run_simulation(n, basewheel, all_symbols, all_weights, 
                                               all_drop_weights_list, linkpoint, all_my_weights, all_ex_weights)
    
    if verbose:
        end_time = time.time()
        elapsed = end_time - start_time
        print(f"模擬完成，耗時: {elapsed:.2f}秒")
        print(f"每秒模擬次數: {n/elapsed:,.0f}")
        print(f"總得分: {np.sum(wins):,}")
        print(f"平均得分: {np.mean(wins):.2f}")
        print(f"最高得分: {np.max(wins):,}")
        print(f"最低得分: {np.min(wins):,}")
        print(f"平均c1數量: {np.mean(c1_counts):.2f}")
    
    return wins, c1_counts

def freegame(n, cascade_multipliers=None, game_set=None, verbose=True):
    """
    執行 n 次 Free Game 模擬
    
    參數:
        n: 執行次數
        cascade_multipliers: 消除倍數 [4] - [第0次, 第1次, 第2次, 第3+次]，預設 [2,4,6,10]
        game_set: 指定使用哪一套資料 (1-6)，None 則每次spin根據 Freewheel 隨機選擇
        verbose: 是否顯示統計資訊
    
    返回:
        wins: numpy array [n] - 每場的總得分
        spins: numpy array [n] - 每場的總spin次數
    """
    # 預設消除倍數
    if cascade_multipliers is None:
        cascade_multipliers = np.array([2, 4, 6, 10], dtype=np.int32)
    else:
        cascade_multipliers = np.array(cascade_multipliers, dtype=np.int32)
    
    data = _get_game_data()
    linkpoint = data['linkpoint']
    
    # 準備參數
    if game_set is not None:
        # 指定參數集，所有spin使用同一套
        symbols = data[f'FreeGameSymbol{game_set}']
        weights = data[f'FreeGameSymbolWeight{game_set}']
        my_weights = data[f'FreeGameMY{game_set}']
        ex_weights = data[f'FreeGameEX{game_set}']
        
        drop_weights_list = np.zeros((4, 5, 34), dtype=np.int32)
        for i in range(4):
            drop_weights_list[i] = data[f'FreeGameDrop{game_set}_{i+1}']
        
        # 將單套參數擴展為6套格式
        all_symbols = np.zeros((6, 5, 150), dtype=np.int32)
        all_weights = np.zeros((6, 5, 150), dtype=np.int32)
        all_drop_weights_list = np.zeros((6, 4, 5, 34), dtype=np.int32)
        all_my_weights = np.zeros((6, 8), dtype=np.int32)
        all_ex_weights = np.zeros((6, 5, 5), dtype=np.int32)
        
        all_symbols[game_set-1] = symbols
        all_weights[game_set-1] = weights
        all_drop_weights_list[game_set-1] = drop_weights_list
        all_my_weights[game_set-1] = my_weights
        all_ex_weights[game_set-1] = ex_weights
        
        freewheel = np.zeros(6, dtype=np.int32)
        freewheel[game_set-1] = 1
        
        if verbose:
            print(f"執行 {n:,} 次 Free Game 模擬 (資料集 {game_set})...")
    else:
        # 每次spin根據Freewheel抽選，準備所有6套參數
        all_symbols = np.zeros((6, 5, 150), dtype=np.int32)
        all_weights = np.zeros((6, 5, 150), dtype=np.int32)
        all_drop_weights_list = np.zeros((6, 4, 5, 34), dtype=np.int32)
        all_my_weights = np.zeros((6, 8), dtype=np.int32)
        all_ex_weights = np.zeros((6, 5, 5), dtype=np.int32)
        
        for game_idx in range(6):
            game_num = game_idx + 1
            all_symbols[game_idx] = data[f'FreeGameSymbol{game_num}']
            all_weights[game_idx] = data[f'FreeGameSymbolWeight{game_num}']
            all_my_weights[game_idx] = data[f'FreeGameMY{game_num}']
            all_ex_weights[game_idx] = data[f'FreeGameEX{game_num}']
            
            for i in range(4):
                all_drop_weights_list[game_idx][i] = data[f'FreeGameDrop{game_num}_{i+1}']
        
        freewheel = data['Freewheel']
        
        if verbose:
            print(f"執行 {n:,} 次 Free Game 模擬 (每次spin根據Freewheel抽選)...")
    
    if verbose:
        start_time = time.time()
    
    # 執行 n 次 Free Game
    wins = np.zeros(n, dtype=np.int32)
    spins = np.zeros(n, dtype=np.int32)
    cascades_matrix = np.full((n, 50), -1, dtype=np.int32)  # 最多50次spin，記錄每次的消除數，-1表示未使用
    
    for fg_idx in range(n):
        # 每場Free Game的初始設定
        remaining_spins = 10
        fg_total_spins = 0
        fg_total_win = 0
        
        # 執行該場Free Game
        while remaining_spins > 0 and fg_total_spins < 50:  # 場次上限50
            # 抽選參數集
            game_set_idx = weighted_choice(freewheel)
            
            symbols = all_symbols[game_set_idx]
            weights = all_weights[game_set_idx]
            drop_weights_list = all_drop_weights_list[game_set_idx]
            my_weights = all_my_weights[game_set_idx]
            ex_weights = all_ex_weights[game_set_idx]
            
            # 執行一次spin (使用FreeGame版本)
            win, cascade, final_board = play_one_spin_freegame(symbols, weights, drop_weights_list, 
                                                                linkpoint, my_weights, ex_weights, cascade_multipliers)
            
            fg_total_win += win
            cascades_matrix[fg_idx, fg_total_spins] = cascade  # 記錄此次spin的消除數
            fg_total_spins += 1
            remaining_spins -= 1
            
            # 檢查是否retrigger (3個或以上C1)
            c1_count = count_c1(final_board)
            if c1_count >= 3:
                remaining_spins += 5
        
        wins[fg_idx] = fg_total_win
        spins[fg_idx] = fg_total_spins
    
    if verbose:
        end_time = time.time()
        elapsed = end_time - start_time
        print(f"模擬完成，耗時: {elapsed:.2f}秒")
        print(f"每秒模擬次數: {n/elapsed:,.2f}")
        print(f"總得分: {np.sum(wins):,}")
        print(f"平均得分: {np.mean(wins):.2f}")
        print(f"最高得分: {np.max(wins):,}")
        print(f"最低得分: {np.min(wins):,}")
        print(f"平均spin次數: {np.mean(spins):.2f}")
        print(f"最多spin次數: {np.max(spins)}")
        print(f"最少spin次數: {np.min(spins)}")
    
    return wins, spins, cascades_matrix

def superfreegame(n, cascade_multipliers=None, game_set=None, verbose=True):
    """
    執行 n 次 Super Free Game 模擬
    
    參數:
        n: 執行次數
        cascade_multipliers: 消除倍數 [4] - [第0次, 第1次, 第2次, 第3+次]，預設 [2,4,6,10]
        game_set: 指定使用哪一套資料 (1-6)，None 則每次spin根據 Superwheel 隨機選擇
        verbose: 是否顯示統計資訊
    
    返回:
        wins: numpy array [n] - 每場的總得分
        spins: numpy array [n] - 每場的總spin次數
        cascades_matrix: numpy array [n][50] - 每場每次spin的消除數，0表示沒消除
    """
    # 預設消除倍數
    if cascade_multipliers is None:
        cascade_multipliers = np.array([2, 4, 6, 10], dtype=np.int32)
    else:
        cascade_multipliers = np.array(cascade_multipliers, dtype=np.int32)
    
    data = _get_game_data()
    linkpoint = data['linkpoint']
    
    # 準備參數
    if game_set is not None:
        # 指定參數集，所有spin使用同一套
        symbols = data[f'SuperFreeGameSymbol{game_set}']
        weights = data[f'SuperFreeGameSymbolWeight{game_set}']
        my_weights = data[f'SuperFreeGameMY{game_set}']
        ex_weights = data[f'SuperFreeGameEX{game_set}']
        
        drop_weights_list = np.zeros((4, 5, 34), dtype=np.int32)
        for i in range(4):
            drop_weights_list[i] = data[f'SuperFreeGameDrop{game_set}_{i+1}']
        
        # 將單套參數擴展為6套格式
        all_symbols = np.zeros((6, 5, 150), dtype=np.int32)
        all_weights = np.zeros((6, 5, 150), dtype=np.int32)
        all_drop_weights_list = np.zeros((6, 4, 5, 34), dtype=np.int32)
        all_my_weights = np.zeros((6, 8), dtype=np.int32)
        all_ex_weights = np.zeros((6, 5, 5), dtype=np.int32)
        
        all_symbols[game_set-1] = symbols
        all_weights[game_set-1] = weights
        all_drop_weights_list[game_set-1] = drop_weights_list
        all_my_weights[game_set-1] = my_weights
        all_ex_weights[game_set-1] = ex_weights
        
        superwheel = np.zeros(6, dtype=np.int32)
        superwheel[game_set-1] = 1
        
        if verbose:
            print(f"執行 {n:,} 次 Super Free Game 模擬 (資料集 {game_set})...")
    else:
        # 每次spin根據Superwheel抽選，準備所有6套參數
        all_symbols = np.zeros((6, 5, 150), dtype=np.int32)
        all_weights = np.zeros((6, 5, 150), dtype=np.int32)
        all_drop_weights_list = np.zeros((6, 4, 5, 34), dtype=np.int32)
        all_my_weights = np.zeros((6, 8), dtype=np.int32)
        all_ex_weights = np.zeros((6, 5, 5), dtype=np.int32)
        
        for game_idx in range(6):
            game_num = game_idx + 1
            all_symbols[game_idx] = data[f'SuperFreeGameSymbol{game_num}']
            all_weights[game_idx] = data[f'SuperFreeGameSymbolWeight{game_num}']
            all_my_weights[game_idx] = data[f'SuperFreeGameMY{game_num}']
            all_ex_weights[game_idx] = data[f'SuperFreeGameEX{game_num}']
            
            for i in range(4):
                all_drop_weights_list[game_idx][i] = data[f'SuperFreeGameDrop{game_num}_{i+1}']
        
        superwheel = data['Superwheel']
        
        if verbose:
            print(f"執行 {n:,} 次 Super Free Game 模擬 (每次spin根據Superwheel抽選)...")
    
    if verbose:
        start_time = time.time()
    
    # 執行 n 次 Super Free Game
    wins = np.zeros(n, dtype=np.int32)
    spins = np.zeros(n, dtype=np.int32)
    cascades_matrix = np.full((n, 50), -1, dtype=np.int32)  # 最多50次spin，記錄每次的消除數，-1表示未使用
    
    for fg_idx in range(n):
        # 每場Super Free Game的初始設定
        remaining_spins = 10
        fg_total_spins = 0
        fg_total_win = 0
        
        # 執行該場Super Free Game
        while remaining_spins > 0 and fg_total_spins < 50:  # 場次上限50
            # 抽選參數集
            game_set_idx = weighted_choice(superwheel)
            
            symbols = all_symbols[game_set_idx]
            weights = all_weights[game_set_idx]
            drop_weights_list = all_drop_weights_list[game_set_idx]
            my_weights = all_my_weights[game_set_idx]
            ex_weights = all_ex_weights[game_set_idx]
            
            # 執行一次spin (使用FreeGame版本)
            win, cascade, final_board = play_one_spin_freegame(symbols, weights, drop_weights_list, 
                                                                linkpoint, my_weights, ex_weights, cascade_multipliers)
            
            fg_total_win += win
            cascades_matrix[fg_idx, fg_total_spins] = cascade  # 記錄此次spin的消除數
            fg_total_spins += 1
            remaining_spins -= 1
            
            # 檢查是否retrigger (3個或以上C1)
            c1_count = count_c1(final_board)
            if c1_count >= 3:
                remaining_spins += 5
        
        wins[fg_idx] = fg_total_win
        spins[fg_idx] = fg_total_spins
    
    if verbose:
        end_time = time.time()
        elapsed = end_time - start_time
        print(f"模擬完成，耗時: {elapsed:.2f}秒")
        print(f"每秒模擬次數: {n/elapsed:,.2f}")
        print(f"總得分: {np.sum(wins):,}")
        print(f"平均得分: {np.mean(wins):.2f}")
        print(f"最高得分: {np.max(wins):,}")
        print(f"最低得分: {np.min(wins):,}")
        print(f"平均spin次數: {np.mean(spins):.2f}")
        print(f"最多spin次數: {np.max(spins)}")
        print(f"最少spin次數: {np.min(spins)}")
    
    return wins, spins, cascades_matrix

def test_board(board_columns, game_set=1, verbose=True):
    """
    測試特定初始版面的得分
    
    參數:
        board_columns: list of lists, 每個子列表代表一列(從上到下4個符號)
                      例如: [[5,3,3,3], [3,6,4,4], [3,3,5,5], [4,4,4,4], [4,4,4,4]]
        game_set: 使用哪一套資料 (1-6)
        verbose: 是否顯示詳細資訊
    
    返回:
        total_win: 總得分
        cascade_count: 消除次數
    """
    data = _get_game_data()
    
    # 轉換為 [4][5] 的 numpy array
    board = np.zeros((4, 5), dtype=np.int32)
    for col_idx, column in enumerate(board_columns):
        for row_idx, symbol in enumerate(column):
            board[row_idx, col_idx] = symbol
    
    my_weights = data[f'baseGameMY{game_set}']
    ex_weights = data[f'baseGameEX{game_set}']
    linkpoint = data['linkpoint']
    
    # 準備 drop weights
    drop_weights_list = np.zeros((4, 5, 34), dtype=np.int32)
    for i in range(4):
        drop_weights_list[i] = data[f'BaseGameDrop{game_set}_{i+1}']
    
    if verbose:
        print(f"初始版面 (資料集 {game_set}):")
        print_board(board)
    
    total_win, cascade_count = play_custom_board(board, drop_weights_list, linkpoint, my_weights, ex_weights)
    
    if verbose:
        print(f"\n總得分: {total_win}")
        print(f"消除次數: {cascade_count}")
    
    return total_win, cascade_count

def print_board(board):
    """打印版面（美化顯示）"""
    symbol_names = {
        0: 'WD', 1: 'C1', 34: 'W1',
        2: 'M1', 3: 'M2', 4: 'M3', 5: 'M4', 6: 'M5', 7: 'M6', 8: 'M7', 9: 'M8',
        10: 'G1', 11: 'G2', 12: 'G3', 13: 'G4', 14: 'G5', 15: 'G6', 16: 'G7', 17: 'G8',
        18: 'Y1', 19: 'Y2', 20: 'Y3', 21: 'Y4', 22: 'Y5', 23: 'Y6', 24: 'Y7', 25: 'Y8',
        26: 'Z1', 27: 'Z2', 28: 'Z3', 29: 'Z4', 30: 'Z5', 31: 'Z6', 32: 'Z7', 33: 'Z8',
    }
    
    for row in range(4):
        row_str = ""
        for col in range(5):
            symbol = board[row, col]
            name = symbol_names.get(symbol, f'{symbol:2d}')
            row_str += f" {name} "
        print(row_str)

def print_stats(wins):
    """
    打印詳細統計資訊
    
    參數:
        wins: numpy array，得分向量
    """
    n = len(wins)
    print(f"\n=== 統計結果 ===")
    print(f"模擬次數: {n:,}")
    print(f"總贏分: {np.sum(wins):,}")
    print(f"RTP: {np.sum(wins)/n*100:.4f}%")
    print(f"\n平均得分: {np.mean(wins):.4f}")
    print(f"最大得分: {np.max(wins):,}")
    print(f"最小得分: {np.min(wins):,}")
    print(f"標準差: {np.std(wins):.4f}")
    
    print(f"\n=== 得分分佈 ===")
    hit_rate = np.sum(wins > 0) / n * 100
    print(f"中獎率: {hit_rate:.2f}%")
    
    percentiles = [50, 75, 90, 95, 99, 99.9]
    print(f"\n得分百分位數:")
    for p in percentiles:
        val = np.percentile(wins, p)
        print(f"  {p:5.1f}%: {val:10.2f}")
    
    # 得分區間分佈
    print(f"\n得分區間分佈:")
    bins = [0, 1, 50, 100, 200, 500, 1000, 5000, np.inf]
    bin_labels = ['0', '1-49', '50-99', '100-199', '200-499', '500-999', '1000-4999', '5000+']
    hist, _ = np.histogram(wins, bins=bins)
    for label, count in zip(bin_labels, hist):
        pct = count / n * 100
        print(f"  {label:12s}: {count:8,} ({pct:6.2f}%)")



# %%
