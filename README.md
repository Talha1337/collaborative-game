#  Collaborative game

#  Running


```
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```
If production mode:
```
gunicorn -k gevent -w 1 app:app --bind=0.0.0.0:5000
```

If development mode:
```
python3 app.py
```
#  Actions
- Host on EC2
- Put a game on top of this that is rendered consistently.
