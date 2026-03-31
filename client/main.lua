local RewardScene = require("scenes.RewardScene")
local UIConfig = require("config.ui_config")

local scene

function love.load()
    -- Настройка шрифта
    local font = love.graphics.newFont(UIConfig.FONT.PATH, UIConfig.FONT.SIZE)
    love.graphics.setFont(font)
    
    -- Создание сцены
    scene = RewardScene.new()
    scene:load()
end

function love.update(dt)
    scene:update(dt)
end

function love.draw()
    scene:draw()
end

function love.mousepressed(x, y, button)
    scene:mousepressed(x, y, button)
end

function love.mousemoved(x, y)
    scene:mousemoved(x, y)
end
