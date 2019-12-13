#define NAPI_VERSION 6
#define SD_JOURNAL_SUPPRESS_LOCATION

#include <node_api.h>
#include <sys/uio.h>
#include <ctype.h>
#include <systemd/sd-daemon.h>
#include <systemd/sd-journal.h>

napi_value notify_with_fds(napi_env env, napi_callback_info info)
{
    napi_status status;
    size_t argc = 2;
    napi_value args[2];
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    if (status != napi_ok)
        return nullptr;

    if (argc != 2)
    {
        napi_throw_error(env, nullptr, "Wrong arguments");
    }

    size_t len;
    status = napi_get_value_string_utf8(env, args[0], nullptr, 0, &len);
    if (status != napi_ok)
        return nullptr;

    char *state = new char[len + 1];
    status = napi_get_value_string_utf8(env, args[0], state, len + 1, nullptr);

    unsigned int alen;
    status = napi_get_array_length(env, args[1], &alen);

    int *fds = new int[alen];

    for (unsigned int i = 0; i < alen; i++)
    {
        napi_value e;
        status = napi_get_element(env, args[1], i, &e);
        napi_get_value_int32(env, e, &fds[i]);
    }

    int res = sd_pid_notify_with_fds(0, 0, state, fds, 1);
    delete[] state;
    delete[] fds;

    napi_value value;
    status = napi_create_int32(env, res, &value);
    if (status != napi_ok)
        return nullptr;

    return value;
}

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
    const char *priority;
} NamedPriority;

#define STR(num) #num
#define PRIORITY(x) "PRIORITY=" STR(x)
#define NUMBER_OF_ENTRIES(a) sizeof(a) / sizeof(a[0])

const static NamedPriority priorities[] = {
    {"trace", PRIORITY(LOG_DEBUG)},
    {"debug", PRIORITY(LOG_DEBUG)},
    {"info", PRIORITY(LOG_INFO)},
    {"notice", PRIORITY(LOG_NOTICE)},
    {"warn", PRIORITY(LOG_WARNING)},
    {"error", PRIORITY(LOG_ERR)},
    {"crit", PRIORITY(LOG_CRIT)},
    {"alert", PRIORITY(LOG_ALERT)}};

const char *priorityForName(char *name)
{
    for (size_t i = 0; i < NUMBER_OF_ENTRIES(priorities); i++)
    {
        if (strcmp(priorities[i].name, name) == 0)
        {
            return priorities[i].priority;
        }
    }

    return PRIORITY(LOG_INFO);
}

napi_value journal_print_object(napi_env env, napi_callback_info info)
{
    napi_status status;
    size_t argc;
    napi_value args[1];
    int res = 0;

    argc = 1;
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    if (status != napi_ok)
        return nullptr;

    if (argc != 1)
    {
        napi_throw_error(env, nullptr, "Wrong arguments");
    }

    napi_value property_names;
    status = napi_get_property_names(env, args[0], &property_names);
    if (status != napi_ok)
        return nullptr;

    unsigned int number;

    napi_get_array_length(env, property_names, &number);

    struct iovec iov[number];
    char *buffer = new char[number * 256];
    char *last = buffer + number * 256 - 1;
    char *append = buffer;

    size_t writtenEntries;
    for (writtenEntries = 0; writtenEntries < number; writtenEntries++)
    {
        napi_value property_name;
        napi_get_element(env, property_names, writtenEntries, &property_name);

        size_t nameLen;

        status = napi_get_value_string_utf8(env, property_name, nullptr, 0, &nameLen);
        if (status != napi_ok)
            return nullptr;
        char name[nameLen + 1];
        status = napi_get_value_string_utf8(env, property_name, name, nameLen + 1, nullptr);

        napi_value value;
        napi_get_property(env, args[0], property_name, &value);

        char *string = append;
        append += nameLen + 1;

        if (append >= last)
        {
            break;
        }

        size_t stringLen;

        status = napi_get_value_string_utf8(env, value, nullptr, 0, &stringLen);
        if (status != napi_ok)
        {
            strcpy(string + nameLen + 1, "?");
            append += 1 + 1;
        }
        else
        {
            if (append + stringLen + 1 >= last)
            {
                break;
            }

            status = napi_get_value_string_utf8(env, value, string + nameLen + 1, stringLen + 1, nullptr);
            if (status != napi_ok)
            {
                strcpy(string + nameLen + 1, "?");
                append += 1 + 1;
            }
            else
            {
                append += stringLen + 1;
            }
        }

        if (strcmp(name, "severity") == 0)
        {
            const char *p = priorityForName(string + nameLen + 1);
            iov[writtenEntries].iov_base = (void *)p;
            iov[writtenEntries].iov_len = strlen(p);
        }
        else
        {
            char *s = name;
            char *d = string;

            while (*s)
            {
                *d++ = toupper(*s++);
            }
            *d++ = '=';
            iov[writtenEntries].iov_base = string;
            iov[writtenEntries].iov_len = nameLen + stringLen + 1;
        }
    }

    res = sd_journal_sendv(iov, writtenEntries);

    delete[] buffer;

    napi_value value;
    status = napi_create_int32(env, res, &value);
    if (status != napi_ok)
        return nullptr;

    return value;
}

napi_value init(napi_env env, napi_value exports)
{
    napi_status status;
    napi_value value;

    status = napi_create_int32(env, SD_LISTEN_FDS_START, &value);
    if (status != napi_ok)
        return NULL;
    status = napi_set_named_property(env, exports, "LISTEN_FDS_START", value);
    if (status != napi_ok)
        return NULL;

    status = napi_create_function(env, NULL, 0, notify_with_fds, NULL, &value);
    if (status != napi_ok)
        return NULL;
    status = napi_set_named_property(env, exports, "notify_with_fds", value);
    if (status != napi_ok)
        return NULL;

    status = napi_create_function(env, NULL, 0, notify, NULL, &value);
    if (status != napi_ok)
        return NULL;
    status = napi_set_named_property(env, exports, "notify", value);
    if (status != napi_ok)
        return NULL;

    status = napi_create_function(env, NULL, 0, journal_print_object, NULL, &value);
    if (status != napi_ok)
        return NULL;
    status = napi_set_named_property(env, exports, "journal_print_object", value);
    if (status != napi_ok)
        return NULL;

    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init);
