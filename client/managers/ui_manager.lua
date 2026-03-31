local UIManager = {}
UIManager.__index = UIManager

function UIManager.new(rewardManager, button, buttonManager)
    local self = setmetatable({}, UIManager)
    self.rewardManager = rewardManager
    self.button = button
    self.buttonManager = buttonManager
    self.statusText = "Загрузка..."
    self.resultMessage = ""
    return self
end

function UIManager:update()
    -- Обновляем статус текст
    self.statusText = self.rewardManager:getStatusText()
    
    -- Синхронизируем состояние кнопки с reward manager
    self:synchronizeButtonState()
    
    -- Обновляем менеджер кнопки (для таймеров)
    self.buttonManager:update()
end

function UIManager:synchronizeButtonState()
    local canClaim = self.rewardManager.state.canClaim
    local isLocked = self.buttonManager:isLocked()
    local initialized = self.rewardManager.initialized
    
    if canClaim and isLocked then
        -- Награда доступна, но кнопка заблокирована - разблокируем
        self.buttonManager:unlock()
        self.resultMessage = ""
        print("Кнопка разблокирована! Можно получить награду.")
        
    elseif not canClaim and not isLocked and initialized then
        -- Награда недоступна, кнопка разблокирована - блокируем
        self.buttonManager:lock("НАГРАДА НЕДОСТУПНА")
        print("Кнопка заблокирована. Ждём таймер...")
    end
end

function UIManager:handleClick(x, y)
    -- Проверяем клик по кнопке
    if not self.button:containsPoint(x, y) then
        return false
    end
    
    -- Если кнопка заблокирована
    if self.buttonManager:isLocked() then
        return false
    end
    
    -- Проверяем доступность награды
    if not self.rewardManager.state.canClaim then
        self.resultMessage = "Награда пока недоступна. Подождите."
        return false
    end
    
    -- Пытаемся получить награду
    local success, amount, msg = self.rewardManager:claim()
    self.resultMessage = msg
    
    if success then
        -- Успешное получение
        self.buttonManager:lock("НАГРАДА ПОЛУЧЕНА")
        if amount then
            self.resultMessage = string.format("Получено %d монет! Следующая награда будет доступна позже.", amount)
        end
        print('Успешно получено:', amount)
    else
        -- Ошибка
        self.buttonManager:setError()
        print('Ошибка получения:', msg)
    end
    
    return success
end

function UIManager:updateCursor(x, y)
    if not self.buttonManager:isLocked() and self.button:containsPoint(x, y) then
        love.mouse.setCursor(love.mouse.getSystemCursor("hand"))
    else
        love.mouse.setCursor()
    end
end

function UIManager:getStatusText()
    return self.statusText
end

function UIManager:getResultMessage()
    return self.resultMessage
end

return UIManager
