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

    unsigned int alen;
    status = napi_get_array_length(env, args[1], &alen);
    if (status != napi_ok)
    {
        return nullptr;
    }

    char *state = new char[len + 1];
    status = napi_get_value_string_utf8(env, args[0], state, len + 1, nullptr);
    if (status != napi_ok)
        return nullptr;

    int *fds = new int[alen];

    for (unsigned int i = 0; i < alen; i++)
    {
        napi_value e;
        status = napi_get_element(env, args[1], i, &e);
        if (status != napi_ok)
        {
            delete[] state;
            delete[] fds;
            return nullptr;
        }

        napi_get_value_int32(env, e, &fds[i]);
    }

    int res = sd_pid_notify_with_fds(0, 0, state, fds, alen);
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

static bool get_string(napi_env env, napi_value value, char *append, size_t maxLen, size_t *len)
{
    napi_status status;

    status = napi_get_value_string_utf8(env, value, nullptr, 0, len);
    if (status != napi_ok)
    {
        return false;
    }

    if (*len + 1 >= maxLen)
    {
        if (maxLen <= 0)
            return false;
        *len = maxLen;
    }

    status = napi_get_value_string_utf8(env, value, append, *len + 1, nullptr);
    
    return status == napi_ok;
}

napi_value journal_print_object(napi_env env, napi_callback_info info)
{
    napi_status status;
    size_t argc;
    napi_value args[1];
    int res = 0;

    argc = 1;
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    if (argc != 1 || status != napi_ok)
    {
        napi_throw_error(env, nullptr, "Wrong arguments");
    }

    napi_value property_names;
    status = napi_get_property_names(env, args[0], &property_names);
    if (status != napi_ok)
    {
        napi_throw_error(env, nullptr, "ERROR 1");
    }

    unsigned int number;

    napi_get_array_length(env, property_names, &number);

    struct iovec iov[number];
    char *buffer = new char[number * 512];
    char *last = buffer + number * 512 - 1;
    char *append = buffer;

    size_t writtenEntries;
    for (writtenEntries = 0; writtenEntries < number; writtenEntries++)
    {
        napi_value property_name;
        napi_get_element(env, property_names, writtenEntries, &property_name);

        size_t nameLen;
        get_string(env, property_name, append, last - append, &nameLen);
        char *name = append;
        append += nameLen + 1;

        napi_value value;
        status = napi_get_property(env, args[0], property_name, &value);
        if (status != napi_ok)
        {
            delete[] buffer;
            napi_throw_error(env, nullptr, "ERROR 4");
        }

        char *string = append;
        append += nameLen + 1;

        size_t stringLen;
        bool is;
        
        /*status = napi_is_error(env, value, &is);
        if (is)
        {
            status = napi_coerce_to_string(env, value, &value);
            if (status != napi_ok)
            {
                delete[] buffer;
                napi_throw_error(env, nullptr, "ERROR 5");
            }

            get_string(env, value, append, last - append, &stringLen);
            append += stringLen + 1;
        }
        else*/
        {
            status = napi_is_array(env, value, &is);
            if (is)
            {
                unsigned int arrayLength;
                status = napi_get_array_length(env, value, &arrayLength);

                stringLen = 0;

                for (unsigned int i = 0; i < arrayLength; i++)
                {
                    napi_value e;
                    size_t len;

                    status = napi_get_element(env, value, i, &e);
                    if (status != napi_ok)
                    {
                        delete[] buffer;
                        napi_throw_error(env, nullptr, "ERROR 8");
                    }

                    napi_coerce_to_string(env, e, &e);

                    get_string(env, e, append, last - append, &len);
                    stringLen += len;
                    append += len;

                    if (i == arrayLength - 1)
                    {
                        break;
                    }

                    append[0] = '\n';
                    append += 1;
                    stringLen += 1;
                }
            }
            else
            {
                status = napi_get_value_string_utf8(env, value, nullptr, 0, &stringLen);
                if (status != napi_ok)
                {
                    status = napi_coerce_to_string(env, value, &value);
                    if (status != napi_ok)
                    {
                        delete[] buffer;
                        napi_throw_error(env, nullptr, "ERROR 11");
                    }

                    status = napi_get_value_string_utf8(env, value, nullptr, 0, &stringLen);
                    if (status != napi_ok)
                    {
                        delete[] buffer;
                        napi_throw_error(env, nullptr, "ERROR 12");
                    }
                }

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
            iov[writtenEntries].iov_len = nameLen + 1 + stringLen;
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
