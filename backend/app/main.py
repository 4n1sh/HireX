from fastapi import FastAPI

app = FastAPI(title="HireX API")


@app.get("/health")
def health_check():
    return {"status": "ok"}
    
