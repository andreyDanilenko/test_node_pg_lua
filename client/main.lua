local RewardManager = require("managers.reward_manager")
local Button = require("uikit.Button")
local inspect = require("lib.inspect")
-- UI/state
local userId = ""
local status = "Загрузка..."
local resultMessage = ""

local claimButton
local buttonMode = "normal"
local BUTTON_COLORS = {
    normal = { base = {0.2, 0.6, 1}, hover = {0.3, 0.7, 1} },
    success = { base = {0.2, 0.8, 0.2}, hover = {0.25, 0.9, 0.25} },
    error = { base = {0.8, 0.2, 0.2}, hover = {0.9, 0.25, 0.25} },
}

function love.load()
    local font = love.graphics.newFont("fonts/Roboto.ttf", 16) 
    love.graphics.setFont(font) 
    -- Задаем seed для запуска рандома
    -- math.randomseed(os.time())
    userId = string.format("user_%d_%d", os.time(), math.random(100, 999))

    local colors = BUTTON_COLORS[buttonMode]
    claimButton = Button.new(50, 150, 250, 60, "ПОЛУЧИТЬ НАГРАДУ", {
        radius = 10,
        baseColor = colors.base,
        hoverColor = colors.hover,
        textColor = {1, 1, 1},
    })
end

function love.update(dt)
    claimButton:update()
    claimButton:setCursor()

    local text = RewardManager:getStatusText()
    status = text
end

function love.draw()
    love.graphics.clear(0.1, 0.1, 0.1)

    love.graphics.setColor(1, 1, 1)
    love.graphics.print("ID: " .. userId, 50, 40)
    love.graphics.print("Статус: " .. status, 50, 70)
    
    if resultMessage ~= "" then
        love.graphics.setColor(1, 0.8, 0)
        love.graphics.print(resultMessage, 50, 100)
    end

    claimButton:draw()
end

function love.mousepressed(x, y, button)
    if button ~= 1 then return end
    if not claimButton:containsPoint(x, y) then return end

    local success, _, msg = RewardManager:claim()
    resultMessage = msg
    print('success, msg:', inspect(success, msg))
    print('buttonMode:', inspect(buttonMode))  
    print('BUTTON_COLORS[buttonMode]:', inspect(BUTTON_COLORS[buttonMode]))  
    print('claimButton.baseColor:', inspect(claimButton.baseColor))  
    print('claimButton.hoverColor:', inspect(claimButton.hoverColor))  


    buttonMode = success and "success" or "error"
    local colors = BUTTON_COLORS[buttonMode]
    claimButton.baseColor = colors.base
    claimButton.hoverColor = colors.hover
end
