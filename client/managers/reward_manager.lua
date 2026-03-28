local RewardManager = {
    lastClaimTime = 0,
    currentDay = 0,
    COOLDOWN = 10,
    RESET = 20,
    values = {100, 200, 300, 400, 500, 600, 1000}
}

function RewardManager:getData()
    local diff = love.timer.getTime() - self.lastClaimTime
    if self.lastClaimTime == 0 then return "ready", 1
    elseif diff < self.COOLDOWN then return "wait", math.ceil(self.COOLDOWN - diff)
    elseif diff <= self.RESET then return "ready", (self.currentDay % 7) + 1
    else return "reset", 1 end
end

function RewardManager:getStatusText()
    local state, value = self:getData()
    if state == "ready" then
        if self.lastClaimTime == 0 then
            return "Первая награда доступна (День 1)!", true
        end
        return string.format("День %d готов к получению!", value), true
    end

    if state == "wait" then
        return string.format("Ждите %d сек. до следующего дня", value), false
    end

    -- state == "reset"
    return "Время вышло! Серия сброшена до Дня 1", true
end

function RewardManager:claim()
    local state = self:getData()

    if state == "wait" then
        return false, 0, "Нужно подождать!"
    end

    if state == "reset" then
        self.currentDay = 0
    end

    self.currentDay = (self.currentDay % 7) + 1
    local amount = self.values[self.currentDay]
    self.lastClaimTime = love.timer.getTime()
    return true, amount, "Получено: " .. amount .. " монет!"
end

return RewardManager
