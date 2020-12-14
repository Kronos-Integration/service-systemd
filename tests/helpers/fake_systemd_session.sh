if [ -z ${XDG_RUNTIME_DIR} ]
then
  export XDG_RUNTIME_DIR=/run/user/$UID
else
  echo "XDG_RUNTIME_DIR present"
fi
 
if [ -z ${XDG_SESSION_ID} ]
then
  export XDG_SESSION_ID=$(cat /proc/self/sessionid)
else
  echo "XDG_SESSION_ID present"
fi

export
 
