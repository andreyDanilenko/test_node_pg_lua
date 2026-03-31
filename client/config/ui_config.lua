local UIConfig = {}

UIConfig.PANEL = {
    WIDTH = 400,
    HEIGHT = 240,
    BACKGROUND_COLOR = {0.1, 0.1, 0.1}
}

UIConfig.BUTTON = {
    WIDTH = 250,
    HEIGHT = 60,
    OFFSET_Y = 165,
    RADIUS = 10,
    TEXT_COLOR = {1, 1, 1},
    TEXT_NORMAL = "ПОЛУЧИТЬ НАГРАДУ",
    TEXT_LOCKED = "НАГРАДА НЕДОСТУПНА",
    TEXT_SUCCESS = "НАГРАДА ПОЛУЧЕНА"
}

UIConfig.BUTTON_COLORS = {
    normal  = { base = {0.2, 0.6, 1}, hover = {0.3, 0.7, 1} },
    error   = { base = {0.8, 0.2, 0.2}, hover = {0.9, 0.25, 0.25} },
    locked  = { base = {0.5, 0.5, 0.5}, hover = {0.5, 0.5, 0.5} },
}

UIConfig.FONT = {
    PATH = "assets/fonts/Roboto.ttf",
    SIZE = 16
}

return UIConfig
