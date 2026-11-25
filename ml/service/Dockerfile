# NOTE: Docker only allows comments on their OWN line (never after an instruction)

# start from a small Linux that has Python 3.11
FROM python:3.11-slim

# everything goes into /app inside the container
WORKDIR /app

# package list first (Docker caches this step, so rebuilds are faster)
COPY service/requirements.txt service/requirements.txt

# install the packages
RUN pip install --no-cache-dir -r service/requirements.txt

# your feature/windowing code (app.py imports it)
COPY code/ code/

# the API itself
COPY service/app.py service/app.py

# the trained model
COPY output/model.joblib output/model.joblib

# run from the service folder
WORKDIR /app/service

# the container listens on port 8000
EXPOSE 8000

# start the server; 0.0.0.0 = accept connections from outside the container
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
