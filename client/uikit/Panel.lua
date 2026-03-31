local Panel = {}
Panel.__index = Panel

function Panel.new(x, y, w, h)
    local self = setmetatable({}, Panel)
    self.x = x
    self.y = y
    self.w = w
    self.h = h
    return self
end

function Panel:draw(status, coins, message, button)
    -- Рисуем фон панели
    love.graphics.setColor(0.2, 0.2, 0.2)
    love.graphics.rectangle("fill", self.x, self.y, self.w, self.h, 10)
    
    -- Рисуем рамку
    love.graphics.setColor(0.3, 0.3, 0.3)
    love.graphics.rectangle("line", self.x, self.y, self.w, self.h, 10)
    
    -- Заголовок (прижат к верху)
    love.graphics.setColor(1, 1, 1)
    love.graphics.printf("ЕЖЕДНЕВНАЯ НАГРАДА", 
        self.x, self.y + 15, self.w, "center")
    
    -- Монеты (под заголовком)
    love.graphics.printf("Монеты: " .. (coins or 0), 
        self.x, self.y + 40, self.w, "center")
    
    -- Статус и сообщение (всё свободное место)
    local textY = self.y + 70  -- Начало текста после монет
    
    love.graphics.setColor(1, 1, 1)
    love.graphics.printf(status or "Загрузка...", 
        self.x, textY, self.w, "center")
    
    if message and message ~= "" then
        love.graphics.setColor(0.8, 0.8, 0.8)
        love.graphics.printf(message, 
            self.x, textY + 25, self.w, "center")
    end
    
    -- Кнопка (прижата к низу панели)
    if button then
        button:draw()
    end
end

return Panel
