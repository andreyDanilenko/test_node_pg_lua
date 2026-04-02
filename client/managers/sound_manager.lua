local SoundManager = {
    sounds = {},
    music = nil
}

function SoundManager:load()
    -- Загружаем звуки
    local sfxPath = "assets/sounds"
    self.sounds.click   = love.audio.newSource(sfxPath .. "/success.wav", "static")
    self.sounds.success = love.audio.newSource(sfxPath .. "/success.wav", "static")
    self.sounds.coin = love.audio.newSource(sfxPath .. "/success.wav", "static")
    self.sounds.error = love.audio.newSource(sfxPath .. "/success.wav", "static")
    
    -- Фоновая музыка (loop = true для зацикливания)
    self.music = love.audio.newSource("assets/sounds/main.mp3", "stream")
    self.music:setLooping(true)
    
    -- Настройка громкости
    self:setVolume(0.7)  -- 70% громкости
end

function SoundManager:play(soundName)
    local sound = self.sounds[soundName]
    if sound then
        sound:stop()
        sound:play()
    end
end

function SoundManager:playMusic()
    if self.music then
        self.music:play()
    end
end

function SoundManager:stopMusic()
    if self.music then
        self.music:stop()
    end
end

function SoundManager:setVolume(volume)
    for _, sound in pairs(self.sounds) do
        sound:setVolume(volume)
    end
    if self.music then
        self.music:setVolume(volume)
    end
end

return SoundManager
