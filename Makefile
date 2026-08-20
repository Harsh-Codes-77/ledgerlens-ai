.PHONY: setup generate-data run-api run-web run-eval test docker-up docker-down

setup:
	pip install -r apps/api/requirements.txt

generate-data:
	python scripts/generate_dataset.py --records 500 --seed 42 --output data/generated/dataset.json

run-api:
	cd apps/api && uvicorn app.main:app --reload --port 8000

run-web:
	cd apps/web && npm run dev

run-eval:
	python scripts/run_evaluation.py --dataset data/generated/dataset.json

test:
	pytest apps/api/tests

docker-up:
	docker-compose up --build -d

docker-down:
	docker-compose down
