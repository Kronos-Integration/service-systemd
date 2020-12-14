cmake_minimum_required(VERSION 3.10)

project(service-systemd)

file(GLOB SOURCE_FILES "src/*.cpp" "src/*.h")
add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES} ${CMAKE_JS_SRC})

execute_process(COMMAND node -p "require('node-addon-api').include"
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
        OUTPUT_VARIABLE NODE_ADDON_API_DIR
        )
string(REPLACE "\n" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})
string(REPLACE "\"" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})


target_include_directories(${PROJECT_NAME} PRIVATE ${CMAKE_JS_INC} ${NODE_ADDON_API_DIR})
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB};systemd)
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")

SET(CMAKE_INSTALL_PREFIX ${PROJECT_BINARY_DIR}/..)

install(TARGETS ${PROJECT_NAME} RENAME xxx.node DESTINATION .)


add_custom_command(TARGET ${PROJECT_NAME}
    POST_BUILD
    COMMAND cp -r ${PROJECT_SOURCE_DIR}/assets ${PROJECT_BINARY_DIR}/../xx.node 
    )
