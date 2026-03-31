local api = require("managers.api")

local RewardManager = {
    state = {
        currentDay = 1,
        canClaim = false,
        nextClaimInSeconds = nil,
        message = "Загрузка...",
        coins = 0,
    },
    countdown = nil,
    initialized = false,
}

function RewardManager:init()
    -- 1) гость
    local code, data = api.guest_login()
    if code ~= 200 or not data or not data.success then
        self.state.message = "Auth failed"
        return
    end

    -- 2) стартовое состояние
    local ok, _ = self:refreshState()
    if ok then
        self.initialized = true
    end
end

function RewardManager:refreshState()
    local code, data = api.get_state()
    if code == 200 and data and data.success then
        local s = data.data
        self.state.currentDay = s.currentDay
        self.state.canClaim = s.canClaim
        self.state.message = s.message
        self.state.nextClaimInSeconds = s.nextClaimInSeconds

        if s.nextClaimInSeconds then
            self.countdown = s.nextClaimInSeconds
        else
            self.countdown = nil
        end

        return true, s
    else
        self.state.message = "Error fetching state"
        return false, nil
    end
end

function RewardManager:update(dt)
    if self.countdown then
        self.countdown = self.countdown - dt
        if self.countdown <= 0 then
            self.countdown = nil
            self:refreshState()
        end
    end
end

function RewardManager:getStatusText()
    if not self.initialized then
        return self.state.message or "Загрузка..."
    end

    if self.countdown and self.countdown > 0 then
        local secs = math.ceil(self.countdown)
        return string.format("Ждите %d сек. до следующей награды", secs)
    end

    return self.state.message or "..."
end

function RewardManager:claim()
    if not self.initialized then
        return false, 0, "Ещё инициализируемся..."
    end

    local code, data = api.claim()
    if code == 200 and data and data.success then
        local r = data.data
        self.state.coins = self.state.coins + (r.amount or 0)
        self.state.message = r.message or "OK"

        -- после клейма сразу подтягиваем новое состояние
        self:refreshState()

        return true, r.amount or 0, r.message or "OK"
    else
        self.state.message = (data and data.message)
            or "Сегодня награда получена. Приходите позже."
        return false, 0, self.state.message
    end
end

return RewardManager
