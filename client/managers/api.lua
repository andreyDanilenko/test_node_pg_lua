local http = require("socket.http")
local ltn12 = require("ltn12")
local json = require("lib.json")

local M = {
  base_url = "http://localhost:3000/api/v1",
  token = nil,
}

local function request(method, path, body_tbl)
  local url = M.base_url .. path
  local body = body_tbl and json.encode(body_tbl) or ""
  local resp = {}

  local headers = {
    ["Content-Type"] = "application/json",
    ["Content-Length"] = tostring(#body),
  }
  if M.token then
    headers["Authorization"] = "Bearer " .. M.token
  end

  local _, code = http.request{
    url = url,
    method = method,
    headers = headers,
    source = ltn12.source.string(body),
    sink = ltn12.sink.table(resp),
  }

  local text = table.concat(resp)
  local data = (#text > 0) and json.decode(text) or nil
  return code, data
end

function M.guest_login()
  local code, data = request("POST", "/auth/guest", {})
  if code == 200 and data and data.success then
    M.token = data.data.token
  end
  return code, data
end

function M.get_state()
  return request("GET", "/daily-rewards", nil)
end

function M.claim()
  return request("POST", "/daily-rewards/claim", {})
end

return M
