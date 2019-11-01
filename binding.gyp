{
    "variables": {
        "NODEJS": "<!(['sh', '-c', 'which nodejs || which node'])"
    },
    "targets": [
        {
            "target_name": "systemd",
            "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
            "sources": [ "src/systemd.cpp" ],
            "include_dirs": [
                "<!(<(NODEJS) -p \"require('node-addon-api').include\")"
            ],
            "libraries": [
                "<!@(['sh', '-c', 'pkg-config --silence-errors --libs-only-l libsystemd || pkg-config --silence-errors --libs-only-l libsystemd-systemd'])"
            ]
        },
        {
            "target_name": "install_systemd_node",
            "dependencies": ["systemd"],
            "actions": [
                {
                    "action_name": "install_systemd_node",
                    "inputs": [
                        "<@(PRODUCT_DIR)/systemd.node"
                    ],
                    "outputs": [
                        "systemd.node"
                    ],
                    "action": ["cp", "<@(PRODUCT_DIR)/systemd.node", "systemd-<(OS)-<!(uname -m|sed s/armv7l/arm/|sed s/x86_64/x64/).node"]
                }
            ]
        }
    ]
}
