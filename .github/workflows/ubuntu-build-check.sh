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
    libsystemd-dev
)
#RELEASE="$(lsb_release -cs)"

#bash -c "echo 'deb-src http://archive.ubuntu.com/ubuntu/ $RELEASE main restricted universe multiverse' >>/etc/apt/sources.list"
# PPA with some newer build dependencies (like zstd)
#add-apt-repository -y ppa:upstream-systemd-ci/systemd-ci
apt-get -y update
apt-get -y install systemd libsystemd-dev
#apt-get -y install "${PACKAGES[@]}"
#export PATH="$HOME/.local/bin:$PATH"

