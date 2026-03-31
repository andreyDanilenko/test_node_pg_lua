local Button = {}
Button.__index = Button

function Button.new(x, y, w, h, text, opts)
    local self = setmetatable({}, Button)
    self.x, self.y, self.w, self.h = x, y, w, h
    self.text = text
    self.originalText = text  -- Сохраняем оригинальный текст
    opts = opts or {}
    self.radius = opts.radius or 10
    self.baseColor = opts.baseColor or {0.2, 0.6, 1}
    self.hoverColor = opts.hoverColor or {0.3, 0.7, 1}
    self.disabledColor = opts.disabledColor or {0.5, 0.5, 0.5}  -- Цвет для заблокированной кнопки
    self.textColor = opts.textColor or {1, 1, 1}
    self.isHovered = false
    self.isLocked = false  -- Флаг блокировки кнопки
    self.rewardText = opts.rewardText or "Награда получена"  -- Текст после получения награды
    self.onClick = opts.onClick or nil  -- Функция обратного вызова при нажатии
    return self
end

function Button:update()
    local mx, my = love.mouse.getPosition()
    -- Обновляем состояние наведения только если кнопка не заблокирована
    if not self.isLocked then
        self.isHovered = (mx > self.x and mx < self.x + self.w and my > self.y and my < self.y + self.h)
    else
        self.isHovered = false
    end
end

function Button:setCursor()
    if self.isHovered and not self.isLocked then
        love.mouse.setCursor(love.mouse.getSystemCursor("hand"))
    else
        love.mouse.setCursor()
    end
end

function Button:containsPoint(x, y)
    return x > self.x and x < self.x + self.w and y > self.y and y < self.y + self.h
end

-- Метод для нажатия на кнопку
function Button:click()
    if not self.isLocked then
        -- Блокируем кнопку
        self.isLocked = true
        -- Меняем текст
        self.text = self.rewardText
        
        -- Вызываем функцию обратного вызова, если она задана
        if self.onClick then
            self.onClick(self)
        end
        
        return true  -- Возвращаем true, означая что награда была получена
    end
    return false  -- Кнопка заблокирована, награда не выдаётся
end

-- Метод для разблокировки кнопки (если потребуется)
function Button:unlock()
    self.isLocked = false
    self.text = self.originalText
end

-- Метод для проверки, заблокирована ли кнопка
function Button:isLocked()
    return self.isLocked
end

function Button:draw()
    -- Выбираем цвет в зависимости от состояния
    if self.isLocked then
        love.graphics.setColor(self.disabledColor)
    elseif self.isHovered then
        love.graphics.setColor(self.hoverColor)
    else
        love.graphics.setColor(self.baseColor)
    end
    
    love.graphics.rectangle("fill", self.x, self.y, self.w, self.h, self.radius)
    love.graphics.setColor(self.textColor)
    love.graphics.printf(self.text, self.x, self.y + (self.h / 2) - 8, self.w, "center")
end

return Button
