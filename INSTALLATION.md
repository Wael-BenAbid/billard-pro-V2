# Installer Billard Pro sur un PC (Windows)

## 1. Prérequis (une seule fois)

1. **Docker Desktop** : https://www.docker.com/products/docker-desktop/
   Installez-le, redémarrez le PC si demandé, puis lancez Docker Desktop et attendez qu'il soit prêt (icône verte).
2. **Git** : https://git-scm.com/download/win

## 2. Installer l'application

Ouvrez **PowerShell** et tapez :

```powershell
cd $HOME\Desktop
git clone https://github.com/Wael-BenAbid/billard-pro-V2.git
cd billard-pro-V2
powershell -ExecutionPolicy Bypass -File scripts\install.ps1
```

Le script :
- crée le fichier `.env` avec une clé secrète unique et l'adresse réseau du PC ;
- construit et démarre le conteneur Docker (quelques minutes la première fois) ;
- affiche le **mot de passe admin** généré. **Notez-le** : il n'est affiché qu'une fois.

Ouvrez ensuite **http://localhost** et connectez-vous avec `admin` et ce mot de passe.

> Depuis une tablette ou un téléphone sur le même Wi-Fi : `http://<IP-du-PC>`
> (l'IP est dans `ALLOWED_HOSTS` du fichier `.env`).

L'application redémarre toute seule avec Docker Desktop (au démarrage du PC si Docker Desktop est configuré pour se lancer automatiquement).

## 3. Transférer les données de l'ancien PC (optionnel)

**Sur l'ancien PC**, dans le dossier du projet :

```powershell
powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1
```

Copiez le fichier créé dans `backups\` (clé USB, e-mail…) vers le dossier `backups\` du nouveau PC.

**Sur le nouveau PC**, après l'installation :

```powershell
powershell -ExecutionPolicy Bypass -File scripts\restore-db.ps1 backups\billard_AAAA-MM-JJ_HH-MM.sqlite3
```

Toutes les données sont reprises : sessions, clients, paramètres **et comptes utilisateurs**
(les mots de passe de l'ancien PC fonctionnent donc sur le nouveau).

## 4. Mettre à jour vers une nouvelle version

```powershell
cd $HOME\Desktop\billard-pro-V2
git pull
powershell -ExecutionPolicy Bypass -File scripts\install.ps1
```

Les données sont conservées.

## Commandes utiles

| Action | Commande |
|---|---|
| Sauvegarder la base | `powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1` |
| Voir les journaux | `docker logs billarde` |
| Changer le mot de passe admin | `docker exec -it billarde python manage.py changepassword admin` |
| Arrêter l'application | `docker compose stop` |
| Redémarrer l'application | `docker compose start` |

⚠️ N'utilisez jamais `docker compose down -v` : l'option `-v` **efface la base de données**.

## Problèmes fréquents

- **« Docker Desktop n'est pas démarré »** : lancez Docker Desktop et attendez l'icône verte.
- **Le port 80 est déjà utilisé** : dans `.env`, mettez `HOST_PORT=8080`, relancez `scripts\install.ps1`, puis ouvrez http://localhost:8080.
- **« Bad Request (400) » depuis une tablette** : ajoutez l'IP du PC à `ALLOWED_HOSTS` dans `.env`, puis relancez `scripts\install.ps1`.
