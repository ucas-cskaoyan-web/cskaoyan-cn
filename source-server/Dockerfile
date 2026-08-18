ARG PYTHON_IMAGE=docker.m.daocloud.io/library/python:3.12-alpine
FROM ${PYTHON_IMAGE}

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN addgroup -g 10001 app && adduser -D -u 10001 -G app app

WORKDIR /app
COPY --chown=app:app app.py /app/app.py

USER app
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=2)"]

CMD ["python", "/app/app.py"]
