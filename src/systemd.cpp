#define NAPI_VERSION 6
#include <node_api.h>
#include <systemd/sd-daemon.h>
#include <systemd/sd-journal.h>

namespace daemon
{

napi_value notify(napi_env env, napi_callback_info info)
{
    napi_status status;
    size_t argc = 1;
    napi_value args[1];
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    if (status != napi_ok)
        return nullptr;

    if (argc != 1)
    {
        napi_throw_error(env, nullptr, "Wrong arguments");
    }

    size_t len;
    status = napi_get_value_string_utf8(env, args[0], nullptr, 0, &len);
    if (status != napi_ok)
        return nullptr;

    char *state = new char[len + 1];
    status = napi_get_value_string_utf8(env, args[0], state, len + 1, nullptr);
    int res = sd_notify(0, state);
    delete[] state;

    napi_value value;
    status = napi_create_int32(env, res, &value);
    if (status != napi_ok)
        return nullptr;

    return value;
}

napi_value journal_print(napi_env env, napi_callback_info info)
{
    napi_status status;
    size_t argc;
    size_t len;
    napi_value args[2];

    argc = 2;
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    if (status != napi_ok)
        return nullptr;

    if (argc != 2)
    {
        napi_throw_error(env, nullptr, "Wrong arguments");
    }

    status = napi_get_value_string_utf8(env, args[0], nullptr, 0, &len);
    if (status != napi_ok)
        return nullptr;

    char *severity = new char[len + 1];
    status = napi_get_value_string_utf8(env, args[0], severity, len + 1, nullptr);

    int priority = LOG_INFO;

    if (strcmp(severity, "error") == 0)
    {
        priority = LOG_ERR;
    }
    else if (strcmp(severity, "warning") == 0)
    {
        priority = LOG_WARNING;
    }
    else if (strcmp(severity, "debug") == 0)
    {
        priority = LOG_DEBUG;
    }
    else if (strcmp(severity, "info") == 0)
    {
        priority = LOG_INFO;
    }

    //LOG_EMERG, LOG_ALERT, LOG_CRIT, LOG_NOTICE

    delete[] severity;

    status = napi_get_value_string_utf8(env, args[1], nullptr, 0, &len);
    if (status != napi_ok)
        return nullptr;

    char *message = new char[len + 1];
    status = napi_get_value_string_utf8(env, args[1], message, len + 1, nullptr);
    int res = sd_journal_print(priority, message);
    delete[] message;

    napi_value value;
    status = napi_create_int32(env, res, &value);
    if (status != napi_ok)
        return nullptr;

    return value;
}

} // namespace daemon

napi_value init(napi_env env, napi_value exports)
{
    napi_status status;
    napi_value listenFdsStart;
    status = napi_create_int32(env, SD_LISTEN_FDS_START, &listenFdsStart);
    if (status != napi_ok)
        return nullptr;
    napi_property_descriptor desc[] = {
        {"LISTEN_FDS_START", nullptr, nullptr, nullptr, nullptr, listenFdsStart, napi_default, nullptr},
        {"notify", nullptr, daemon::notify, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"journal_print", nullptr, daemon::journal_print, nullptr, nullptr, nullptr, napi_default, nullptr}};
    status = napi_define_properties(env, exports, sizeof(desc) / sizeof(desc[0]), desc);
    if (status != napi_ok)
        return nullptr;
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init);
