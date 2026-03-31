local RewardManager = require("managers.reward_manager")
local Button = require("uikit.Button")
local Panel = require("uikit.Panel")
local UIConfig = require("config/ui_config")
local SoundManager = require("managers.sound_manager") 

local RewardScene = {}
RewardScene.__index = RewardScene

function RewardScene.new()
    local self = setmetatable({}, RewardScene)
    
    self.status = "Загрузка..."
    self.resultMessage = ""
    self.panel = nil
    self.claimButton = nil
    self.rewardManager = RewardManager
    
    -- Эффекты
    self.confetti = {}
    self.flashTimer = nil
    
    return self
end

function RewardScene:load()
    -- Загружаем звуки
    SoundManager:load()
    
    -- Включаем фоновую музыку
    SoundManager:playMusic()
    
    local sw, sh = love.graphics.getDimensions()
    local panelX = (sw - UIConfig.PANEL.WIDTH) / 2
    local panelY = (sh - UIConfig.PANEL.HEIGHT) / 2
    
    self.panel = Panel.new(panelX, panelY, UIConfig.PANEL.WIDTH, UIConfig.PANEL.HEIGHT)
    
    local btnX = panelX + (UIConfig.PANEL.WIDTH - UIConfig.BUTTON.WIDTH) / 2
    local btnY = panelY + UIConfig.BUTTON.OFFSET_Y
    
    self.claimButton = Button.new(btnX, btnY, 
        UIConfig.BUTTON.WIDTH, 
        UIConfig.BUTTON.HEIGHT, 
        UIConfig.BUTTON.TEXT_NORMAL, {
        radius = UIConfig.BUTTON.RADIUS,
        baseColor = UIConfig.BUTTON_COLORS.normal.base,
        hoverColor = UIConfig.BUTTON_COLORS.normal.hover,
        disabledColor = UIConfig.BUTTON_COLORS.locked.base,
        textColor = UIConfig.BUTTON.TEXT_COLOR,
        rewardText = UIConfig.BUTTON.TEXT_SUCCESS,
        onClick = function(button)
            -- Звук нажатия на кнопку
            SoundManager:play("click")
        end
    })
    
    self.rewardManager:init()
end

function RewardScene:startConfetti()
    local sw, sh = love.graphics.getDimensions()
    for i = 1, 100 do
        table.insert(self.confetti, {
            x = math.random(0, sw),
            y = math.random(-sh, 0),
            vx = math.random(-50, 50),
            vy = math.random(100, 300),
            size = math.random(3, 8),
            color = {math.random(), math.random(), math.random()},
            rotation = math.random() * math.pi * 2
        })
    end
    
    self.flashTimer = 0
end

function RewardScene:updateEffects(dt)
    if self.flashTimer then
        self.flashTimer = self.flashTimer + dt
        if self.flashTimer >= 0.3 then
            self.flashTimer = nil
        end
    end
    
    local sh = love.graphics.getHeight()
    for i = #self.confetti, 1, -1 do
        local c = self.confetti[i]
        c.x = c.x + c.vx * dt
        c.y = c.y + c.vy * dt
        c.vy = c.vy + 200 * dt
        c.rotation = c.rotation + 5 * dt
        
        if c.y > sh + 50 then
            table.remove(self.confetti, i)
        end
    end
end

function RewardScene:drawEffects()
    local sw, sh = love.graphics.getDimensions()
    
    if self.flashTimer then
        local alpha = 1 - (self.flashTimer / 0.3)
        love.graphics.setColor(1, 1, 1, alpha)
        love.graphics.rectangle("fill", 0, 0, sw, sh)
    end
end

function RewardScene:drawConfetti()
    for _, c in ipairs(self.confetti) do
        love.graphics.setColor(c.color[1], c.color[2], c.color[3])
        love.graphics.push()
        love.graphics.translate(c.x, c.y)
        love.graphics.rotate(c.rotation)
        love.graphics.rectangle("fill", -c.size/2, -c.size/2, c.size, c.size)
        love.graphics.pop()
    end
end

function RewardScene:update(dt)
    self.rewardManager:update(dt)
    self:synchronizeButtonState()
    self.claimButton:update()
    self.status = self.rewardManager:getStatusText()
    self:updateEffects(dt)
end

function RewardScene:synchronizeButtonState()
    local canClaim = self.rewardManager.state.canClaim
    local isLocked = self.claimButton.isLocked
    local initialized = self.rewardManager.initialized
    
    if canClaim and isLocked then
        self.claimButton:unlock()
        self.resultMessage = ""
    elseif not canClaim and not isLocked and initialized then
        self.claimButton.isLocked = true
        self.claimButton.text = UIConfig.BUTTON.TEXT_LOCKED
    end
end

function RewardScene:draw()
    love.graphics.clear(UIConfig.PANEL.BACKGROUND_COLOR)
    
    self:drawEffects()
    
    self.panel:draw(
        self.status, 
        self.rewardManager.state.coins, 
        self.resultMessage, 
        self.claimButton
    )
    
    self:drawConfetti()
end

function RewardScene:mousepressed(x, y, button)
    if button ~= 1 then return end
    if not self.claimButton:containsPoint(x, y) then return end
    
    local success = self.claimButton:click()
    
    if success then
        local claimSuccess, amount, msg = self.rewardManager:claim()
        self.resultMessage = msg
        
        if claimSuccess and amount then
            self.resultMessage = string.format("Получено %d монет! %s", amount, msg)
            
            -- ЗВУКИ ПРИ УСПЕХЕ!
            SoundManager:play("success")  -- Звук успеха
            SoundManager:play("coin")     -- Звук монет
            
            -- Запускаем конфетти
            self:startConfetti()
        else
            -- ЗВУК ПРИ ОШИБКЕ
            SoundManager:play("error")
        end
        
        if not claimSuccess then
            self.claimButton:unlock()
        end
    end
end

function RewardScene:mousemoved(x, y)
    self.claimButton:setCursor()
end

return RewardScene
