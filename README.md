使い方
======
## リグで実行
1. リグにavahiをインストールする
2. `cp /usr/share/doc/avahi/ssh.service /etc/avahi/services/`などでSSHサービスを自動検出できるようにする。
3. `systemctl enable avahi-daemon`
4. `systemctl start avahi-daemon`
## 管理するPCで実行
1. `npm install`
2. `npm run`