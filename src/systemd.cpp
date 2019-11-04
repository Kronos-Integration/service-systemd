#define NAPI_VERSION 6
#include <node_api.h>
#include <systemd/sd-daemon.h>

#define SD_JOURNAL_SUPPRESS_LOCATION
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

typedef struct
{
    const char *name;
    int priority;
} NamedPriority;

const static NamedPriority priorities[] = {
    {"trace", LOG_DEBUG},
    {"debug", LOG_DEBUG},
    {"info", LOG_INFO},
    {"notice", LOG_NOTICE},
    {"warn", LOG_WARNING},
    {"error", LOG_ERR},
    {"crit", LOG_CRIT},
    {"alert", LOG_ALERT}};

int priorityForName(char *name)
{
    for (size_t i = 0; i < sizeof(priorities) / sizeof(priorities[0]); i++)
    {
        if (strcmp(priorities[i].name, name) == 0)
        {
            return priorities[i].priority;
        }
    }

    return LOG_INFO;
}

/*
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

    const int priority = priorityForName(severity);

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
*/

napi_value journal_print_object(napi_env env, napi_callback_info info)
{
    napi_status status;
    size_t argc;
    napi_value args[1];
    int res = 0;
    int priority = LOG_INFO;

    argc = 1;
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    if (status != napi_ok)
        return nullptr;

    if (argc != 1)
    {
        napi_throw_error(env, nullptr, "Wrong arguments");
    }

#define MAX_MESSAGE_LEN 256
    char *message = new char[MAX_MESSAGE_LEN];
    char *pos = message;

    napi_value property_names;
    status = napi_get_property_names(env, args[0], &property_names);
    if (status != napi_ok)
        return nullptr;

    unsigned int number;
    napi_get_array_length(env, property_names, &number);

    for (size_t i = 0; i < number; i++)
    {
        size_t len;

        napi_value property_name;
        napi_get_element(env, property_names, i, &property_name);

        status = napi_get_value_string_utf8(env, property_name, nullptr, 0, &len);
        if (status != napi_ok)
            return nullptr;
        char *name = new char[len + 1];
        status = napi_get_value_string_utf8(env, property_name, name, len + 1, nullptr);

        napi_value value;
        napi_get_property(env, args[0], property_name, &value);

        status = napi_get_value_string_utf8(env, value, nullptr, 0, &len);
        if (status != napi_ok)
            return nullptr;

        char *string = new char[len + 1];
        status = napi_get_value_string_utf8(env, value, string, len + 1, nullptr);
        if (status != napi_ok)
        {
            strcpy(string, "?");
        }

        if (strcmp(name, "severity") == 0)
        {
            priority = priorityForName(string);
        }
        else
        {
            if (pos != message && pos - message < MAX_MESSAGE_LEN - 1)
                *pos++ = ',';

            const auto len = strlen(name);

            if (strcmp(name, "message") != 0 && pos + len + 1 - message < MAX_MESSAGE_LEN - 1)
            {
                strcpy(pos, name);
                pos += len;
                *pos++ = '=';
            }

            const auto len2 = strlen(string);

            if (pos + len2 + 1 - message < MAX_MESSAGE_LEN - 1)
            {
                strcpy(pos, string);
                pos += len2;
            }
        }

        delete[] string;
        delete[] name;
    }

    res = sd_journal_print(priority, message);

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
        //  {"journal_print", nullptr, daemon::journal_print, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"journal_print_object", nullptr, daemon::journal_print_object, nullptr, nullptr, nullptr, napi_default, nullptr}};
    status = napi_define_properties(env, exports, sizeof(desc) / sizeof(desc[0]), desc);
    if (status != napi_ok)
        return nullptr;
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init);
