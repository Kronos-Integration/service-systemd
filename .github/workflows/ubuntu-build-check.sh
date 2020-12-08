#!/bin/bash

set -ex

info() { echo -e "\033[33;1m$1\033[0m"; }
fatal() { echo >&2 -e "\033[31;1m$1\033[0m"; exit 1; }
success() { echo >&2 -e "\033[32;1m$1\033[0m"; }

ARGS=(
    "--optimization=0"
    "--optimization=2"
    "--optimization=s"
    "--optimization=3 -Db_lto=true"
    "--optimization=3 -Db_lto=false"
    "-Db_ndebug=true"
)
PACKAGES=(
    cryptsetup-bin
    expect
    fdisk
    gettext
    iputils-ping
    isc-dhcp-client
    itstool
    kbd
    libblkid-dev
    libcap-dev
    libcurl4-gnutls-dev
    libfdisk-dev
    libfido2-dev
    libgpg-error-dev
    liblz4-dev
    liblzma-dev
    libmicrohttpd-dev
    libmount-dev
    libp11-kit-dev
    libpwquality-dev
    libqrencode-dev
    libssl-dev
    libxkbcommon-dev
    libxtables-dev
    libzstd-dev
    mount
    net-tools
    perl
    python-lxml
    python3-evdev
    python3-lxml
    python3-pip
    python3-pyparsing
    python3-setuptools
    quota
    strace
    unifont
    util-linux
    zstd
)
RELEASE="$(lsb_release -cs)"

bash -c "echo 'deb-src http://archive.ubuntu.com/ubuntu/ $RELEASE main restricted universe multiverse' >>/etc/apt/sources.list"

# PPA with some newer build dependencies (like zstd)
add-apt-repository -y ppa:upstream-systemd-ci/systemd-ci
apt-get -y update
apt-get -y build-dep systemd
apt-get -y install "${PACKAGES[@]}"
export PATH="$HOME/.local/bin:$PATH"

$CC --version
