# Personal Assistant

A personal-use local web app for tracking wishlists, inventory, decision matrices, and a financial portfolio.

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Autostart on Ubuntu

To have the app start automatically when you log in, create a **systemd user service**.

### Option A — systemd user service (recommended)

1. Create the service file:

```bash
mkdir -p ~/.config/systemd/user
cat > ~/.config/systemd/user/personal-assistant.service << 'EOF'
[Unit]
Description=Personal Assistant web app
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/than/PersonalAssistant
ExecStart=/usr/bin/npm run dev
Restart=on-failure
Environment=NODE_ENV=development
Environment=PORT=3000

[Install]
WantedBy=default.target
EOF
```

2. Enable and start it:

```bash
systemctl --user daemon-reload
systemctl --user enable personal-assistant
systemctl --user start personal-assistant
```

3. Verify it's running:

```bash
systemctl --user status personal-assistant
```

4. To view logs:

```bash
journalctl --user -u personal-assistant -f
```

> **Note:** For `systemctl --user` services to persist after logout, run once:
> `sudo loginctl enable-linger $USER`

### Option B — GNOME autostart (desktop entry)

If you use GNOME and prefer a lighter approach, create an autostart `.desktop` file:

```bash
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/personal-assistant.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=Personal Assistant
Exec=bash -c 'cd /home/than/PersonalAssistant && npm run dev'
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF
```

This runs on login and is stopped when you log out. No persistence between sessions.

### Stopping the service (Option A)

```bash
systemctl --user stop personal-assistant
systemctl --user disable personal-assistant  # remove from autostart
```
