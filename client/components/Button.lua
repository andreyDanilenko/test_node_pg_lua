local Button = {}
Button.__index = Button

function Button.new(x, y, w, h, text, opts)
    local self = setmetatable({}, Button)
    self.x, self.y, self.w, self.h = x, y, w, h
    self.text = text
    opts = opts or {}
    self.radius = opts.radius or 10
    self.baseColor = opts.baseColor or {0.2, 0.6, 1}
    self.hoverColor = opts.hoverColor or {0.3, 0.7, 1}
    self.textColor = opts.textColor or {1, 1, 1}
    self.isHovered = false
    self.isLocked = false
    return self
end

function Button:update()
    local mx, my = love.mouse.getPosition()
    self.isHovered = (mx > self.x and mx < self.x + self.w and 
                      my > self.y and my < self.y + self.h)
end

function Button:containsPoint(x, y)
    return x > self.x and x < self.x + self.w and 
           y > self.y and y < self.y + self.h
end

function Button:draw()
    if self.isHovered and not self.isLocked then
        love.graphics.setColor(self.hoverColor)
    else
        love.graphics.setColor(self.baseColor)
    end
    
    love.graphics.rectangle("fill", self.x, self.y, self.w, self.h, self.radius)
    love.graphics.setColor(self.textColor)
    love.graphics.printf(self.text, self.x, self.y + (self.h / 2) - 8, self.w, "center")
end

return Button
