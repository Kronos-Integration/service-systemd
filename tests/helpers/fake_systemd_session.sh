if [ -z ${XDG_RUNTIME_DIR} ]
then
  export XDG_RUNTIME_DIR=/run/user/$UID
else
  echo "XDG_RUNTIME_DIR present"
fi
 
if [ -z ${DBUS_SESSION_BUS_ADDRESS} ]
then
  export DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$UID/bus"
else
  echo "DBUS_SESSION_BUS_ADDRESS present"
fi
 
if [ -z ${XDG_SESSION_ID} ]
then
  export XDG_SESSION_ID=$(cat /proc/self/sessionid)
else
  echo "XDG_SESSION_ID present"
fi

ls -l /lib/systemd

ps -ef|grep -v grep|grep 'systemd --user'
if [ $? -eq 1 ]
then
  echo "start systemd --user"

  set -xv
XDG_RUNTIME_DIR=run/user/$UID /lib/systemd/systemd --user
  #/lib/systemd/systemd --user
else
  echo "systemd --user already running"
fi

export

ps -ef|grep systemd

