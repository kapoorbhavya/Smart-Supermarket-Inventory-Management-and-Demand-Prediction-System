from fastapi import FastAPI
import joblib
import json
import os
from pydantic import BaseModel , Field
import pandas as pd
from pymongo import MongoClient
from datetime import datetime, timedelta
import numpy as np
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Supermarket Inventory Management API",
    description="API for supermarket inventory analysis and ML forecasting",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------
# MongoDB Connection
# -----------------------------------

MONGO_URL = "mongodb://localhost:27017/"

client = MongoClient(MONGO_URL)

db = client["supermarket_inventory"]

products_collection = db["products"]
inventory_collection = db["inventory"]
sales_collection = db["sales"]
recommendations_collection = db["inventory_recommendations"]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
class PredictionInput(BaseModel):
    product_id: str
    day_of_week: int
    month: int
    is_weekend: int
    week_of_year: int

    lag_1: float
    lag_7: float
    lag_14: float
    lag_30: float

    rolling_3: float
    rolling_7: float
    rolling_14: float
    rolling_30: float

    rolling_7_std: float
    rolling_14_std: float
    rolling_30_std: float

class Product(BaseModel):
    product_id: str
    product_name: str
    category: str
    price: float = Field(gt=0)
    supplier: str
    minimum_stock: int = Field(ge=0)
    maximum_stock: int = Field(ge=0)
    active: bool = True

class Inventory(BaseModel):
    product_id: str
    batch_id: str
    quantity: int = Field(ge=0)
    purchase_date: str
    expiry_date: str
    storage_location: str

MODEL_PATH = os.path.join(
    BASE_DIR,
    "saved_model",
    "inventory_model.joblib"
)

FEATURES_PATH = os.path.join(
    BASE_DIR,
    "saved_model",
    "model_features.json"
)

model = joblib.load(MODEL_PATH)

with open(FEATURES_PATH, "r") as file:
    model_features = json.load(file)


@app.get("/")
def root():
    return {
        "message": "Supermarket Inventory Management API is running"
    }


# -----------------------------------
# Model information
# -----------------------------------

@app.get("/model-info")
def model_info():
    return {
        "model_loaded": True,
        "model_type": type(model).__name__,
        "number_of_features": len(model_features),
        "features": model_features
    }
@app.post("/predict")
def predict_demand(data: PredictionInput):

    # Convert request to dictionary
    input_data = data.model_dump()

    # Convert to DataFrame
    input_df = pd.DataFrame([input_data])

    # One-hot encode product_id
    input_df = pd.get_dummies(
        input_df,
        columns=["product_id"]
    )

    # Make sure the columns are exactly
    # the same as during model training
    input_df = input_df.reindex(
        columns=model_features,
        fill_value=0
    )

    # Make prediction
    prediction = model.predict(input_df)[0]

    # Prevent negative demand
    prediction = max(0, prediction)

    return {
        "predicted_demand": round(float(prediction), 2)
    }

@app.get("/database-test")
def database_test():

    try:
        client.admin.command("ping")

        return {
            "status": "connected",
            "database": "supermarket_inventory",
            "message": "MongoDB connection successful"
        }

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }
@app.get("/products")
def get_products():

    products = list(
        products_collection.find(
            {},
            {"_id": 0}
        )
    )

    return {
        "count": len(products),
        "products": products
    }
# -----------------------------------
# Get all inventory batches
# -----------------------------------

@app.get("/inventory")
def get_inventory():

    inventory = list(
        inventory_collection.find(
            {},
            {"_id": 0}
        )
    )

    return {
        "count": len(inventory),
        "inventory": inventory
    }
@app.get("/sales")
def get_sales():

    sales = list(
        sales_collection.find(
            {},
            {"_id": 0}
        )
    )

    return {
        "count": len(sales),
        "sales": sales
    }

# Add a new product
# -----------------------------------

@app.post("/products")
def add_product(product: Product):

    # Check whether product already exists
    existing_product = products_collection.find_one(
        {"product_id": product.product_id}
    )

    if existing_product:
        return {
            "status": "error",
            "message": f"Product {product.product_id} already exists"
        }

    # Check stock limits
    if product.minimum_stock > product.maximum_stock:
        return {
            "status": "error",
            "message": "Minimum stock cannot be greater than maximum stock"
        }

    # Insert product (always active when newly created)
    product_data = product.model_dump()
    product_data["active"] = True
    products_collection.insert_one(product_data)

    return {
        "status": "success",
        "message": "Product added successfully",
        "product": product_data
    }


# -----------------------------------
# Update product
# -----------------------------------

@app.put("/products/{product_id}")
def update_product(product_id: str, product: Product):

    existing_product = products_collection.find_one(
        {"product_id": product_id}
    )

    if not existing_product:
        return {
            "status": "error",
            "message": f"Product {product_id} not found"
        }

    if product.minimum_stock > product.maximum_stock:
        return {
            "status": "error",
            "message": "Minimum stock cannot be greater than maximum stock"
        }

    # Keep URL product_id as the actual ID
    updated_data = product.model_dump()
    updated_data["product_id"] = product_id

    products_collection.update_one(
        {"product_id": product_id},
        {"$set": updated_data}
    )


    return {
        "status": "success",
        "message": "Product updated successfully",
        "product": updated_data
    }

@app.delete("/products/{product_id}")
def delete_product(product_id: str):

    existing_product = products_collection.find_one(
        {"product_id": product_id}
    )

    if not existing_product:
        return {
            "status": "error",
            "message": f"Product {product_id} not found"
        }

    products_collection.update_one(
        {"product_id": product_id},
        {
            "$set": {
                "active": False
            }
        }
    )

    return {
        "status": "success",
        "message": f"Product {product_id} has been deactivated"
    }

# -----------------------------------
# Add inventory batch
# -----------------------------------

@app.post("/inventory")
def add_inventory(inventory: Inventory):

    # Check whether batch already exists
    existing_batch = inventory_collection.find_one(
        {"batch_id": inventory.batch_id}
    )

    if existing_batch:
        return {
            "status": "error",
            "message": f"Batch {inventory.batch_id} already exists"
        }

    # Check whether product exists
    existing_product = products_collection.find_one(
        {"product_id": inventory.product_id}
    )

    if not existing_product:
        return {
            "status": "error",
            "message": f"Product {inventory.product_id} does not exist"
        }

    # Insert inventory
    inventory_collection.insert_one(
        inventory.model_dump()
    )

    return {
        "status": "success",
        "message": "Inventory batch added successfully",
        "inventory": inventory.model_dump()
    }

# -----------------------------------
# Update inventory batch
# -----------------------------------

@app.put("/inventory/{batch_id}")
def update_inventory(batch_id: str, inventory: Inventory):

    existing_batch = inventory_collection.find_one(
        {"batch_id": batch_id}
    )

    if not existing_batch:
        return {
            "status": "error",
            "message": f"Batch {batch_id} not found"
        }

    # Check product exists
    existing_product = products_collection.find_one(
        {"product_id": inventory.product_id}
    )

    if not existing_product:
        return {
            "status": "error",
            "message": f"Product {inventory.product_id} does not exist"
        }

    updated_data = inventory.model_dump()

    # Keep URL batch_id
    updated_data["batch_id"] = batch_id

    inventory_collection.update_one(
        {"batch_id": batch_id},
        {"$set": updated_data}
    )

    return {
        "status": "success",
        "message": "Inventory batch updated successfully",
        "inventory": updated_data
    }

# -----------------------------------
# Delete inventory batch
# -----------------------------------

@app.delete("/inventory/{batch_id}")
def delete_inventory(batch_id: str):

    existing_batch = inventory_collection.find_one(
        {"batch_id": batch_id}
    )

    if not existing_batch:
        return {
            "status": "error",
            "message": f"Batch {batch_id} not found"
        }

    inventory_collection.delete_one(
        {"batch_id": batch_id}
    )

    return {
        "status": "success",
        "message": f"Inventory batch {batch_id} deleted successfully"
    }

# -----------------------------------
# Dashboard Summary
# -----------------------------------

@app.get("/dashboard/summary")
def dashboard_summary():

    # Total products
    total_products = products_collection.count_documents({})

    # Total inventory quantity
    inventory_result = list(
        inventory_collection.aggregate([
            {
                "$group": {
                    "_id": None,
                    "total_inventory": {"$sum": "$quantity"}
                }
            }
        ])
    )

    total_inventory_units = (
        inventory_result[0]["total_inventory"]
        if inventory_result
        else 0
    )

    # Total sales quantity and revenue
    sales_result = list(
        sales_collection.aggregate([
            {
                "$group": {
                    "_id": None,
                    "total_sales_quantity": {
                        "$sum": "$quantity_sold"
                    },
                    "total_revenue": {
                        "$sum": "$revenue"
                    }
                }
            }
        ])
    )

    if sales_result:
        total_sales_quantity = sales_result[0]["total_sales_quantity"]
        total_revenue = sales_result[0]["total_revenue"]
    else:
        total_sales_quantity = 0
        total_revenue = 0

    # Products requiring reorder
    products_requiring_reorder = recommendations_collection.count_documents({
        "reorder_quantity": {"$gt": 0}
    })

    # Products with expiry risk
    products_with_expiry_risk = recommendations_collection.count_documents({
        "expiry_risk_quantity": {"$gt": 0}
    })

    return {
        "total_products": total_products,
        "total_inventory_units": total_inventory_units,
        "total_sales_quantity": total_sales_quantity,
        "total_revenue": total_revenue,
        "products_requiring_reorder": products_requiring_reorder,
        "products_with_expiry_risk": products_with_expiry_risk
    }

# -----------------------------------
# Monthly Sales Analytics
# -----------------------------------

@app.get("/sales/monthly")
def monthly_sales():

    result = list(
        sales_collection.aggregate([
            {
                "$group": {
                    "_id": {
                        "year": {"$year": "$date"},
                        "month": {"$month": "$date"}
                    },
                    "total_quantity": {
                        "$sum": "$quantity_sold"
                    },
                    "total_revenue": {
                        "$sum": "$revenue"
                    }
                }
            },
            {
                "$sort": {
                    "_id.year": 1,
                    "_id.month": 1
                }
            }
        ])
    )

    return {
        "count": len(result),
        "monthly_sales": result
    }

# -----------------------------------
# Sales by Category
# -----------------------------------

@app.get("/sales/category")
def sales_by_category():

    result = list(
        sales_collection.aggregate([
            {
                "$lookup": {
                    "from": "products",
                    "localField": "product_id",
                    "foreignField": "product_id",
                    "as": "product"
                }
            },
            {
                "$unwind": "$product"
            },
            {
                "$group": {
                    "_id": "$product.category",
                    "total_quantity": {
                        "$sum": "$quantity_sold"
                    },
                    "total_revenue": {
                        "$sum": "$revenue"
                    }
                }
            },
            {
                "$sort": {
                    "total_revenue": -1
                }
            }
        ])
    )

    return {
        "count": len(result),
        "category_sales": result
    }

# -----------------------------------
# Sales by Product
# -----------------------------------

@app.get("/sales/products")
def sales_by_product():

    result = list(
        sales_collection.aggregate([
            {
                "$lookup": {
                    "from": "products",
                    "localField": "product_id",
                    "foreignField": "product_id",
                    "as": "product"
                }
            },
            {
                "$unwind": "$product"
            },
            {
                "$group": {
                    "_id": "$product_id",
                    "product_name": {
                        "$first": "$product.product_name"
                    },
                    "category": {
                        "$first": "$product.category"
                    },
                    "total_quantity": {
                        "$sum": "$quantity_sold"
                    },
                    "total_revenue": {
                        "$sum": "$revenue"
                    }
                }
            },
            {
                "$sort": {
                    "total_quantity": -1
                }
            }
        ])
    )

    return {
        "count": len(result),
        "product_sales": result
    }

# -----------------------------------
# Expiry Risk
# -----------------------------------

@app.get("/expiry-risk")
def expiry_risk():

    today = datetime.now().date()

    inventory = list(
        inventory_collection.find({}, {"_id": 0})
    )

    expiry_data = []

    for item in inventory:

        expiry_value = item["expiry_date"]

        # Handle string date
        if isinstance(expiry_value, str):
            expiry_date = datetime.fromisoformat(
                expiry_value
            ).date()

        # Handle MongoDB datetime
        else:
            expiry_date = expiry_value.date()

        days_remaining = (
            expiry_date - today
        ).days

        if days_remaining < 0:
            risk = "EXPIRED"

        elif days_remaining <= 3:
            risk = "HIGH"

        elif days_remaining <= 7:
            risk = "MEDIUM"

        else:
            risk = "LOW"

        expiry_data.append({
            "product_id": item["product_id"],
            "batch_id": item["batch_id"],
            "quantity": item["quantity"],
            "expiry_date": str(expiry_value),
            "days_remaining": days_remaining,
            "risk": risk
        })

    return {
        "count": len(expiry_data),
        "expiry_risk": expiry_data
    }

# -----------------------------------
# Inventory Recommendations
# -----------------------------------

@app.get("/recommendations")
def get_recommendations():

    recommendations = list(
        recommendations_collection.find(
            {},
            {"_id": 0}
        )
    )

    return {
        "count": len(recommendations),
        "recommendations": recommendations
    }

# -----------------------------------
# ML Forecast
# -----------------------------------

@app.get("/forecast")
def forecast(days: int = 7):

    if days < 1 or days > 30:
        return {
            "status": "error",
            "message": "Days must be between 1 and 30"
        }

    # Get sales history
    sales = list(
        sales_collection.find(
            {},
            {
                "_id": 0,
                "product_id": 1,
                "date": 1,
                "quantity_sold": 1
            }
        )
    )

    if not sales:
        return {
            "status": "error",
            "message": "No sales data found"
        }

    # Convert sales to DataFrame
    history = pd.DataFrame(sales)

    # Convert date column
    history["date"] = pd.to_datetime(history["date"])

    # Sort history
    history = history.sort_values(
        ["product_id", "date"]
    ).reset_index(drop=True)

    # Make sure quantity is numeric
    history["quantity_sold"] = pd.to_numeric(
        history["quantity_sold"]
    )

    # Get products that have sales history
    products = sorted(
        history["product_id"].unique()
    )

    # Last date in database
    last_date = history["date"].max()

    forecast_results = []

    # -----------------------------------
    # Recursive forecasting
    # -----------------------------------

    for day in range(1, days + 1):

        forecast_date = (
            last_date + timedelta(days=day)
        )

        daily_predictions = []

        for product_id in products:

            # Get this product's history
            product_history = history[
                history["product_id"] == product_id
            ].sort_values("date")

            sales_values = (
                product_history["quantity_sold"]
                .astype(float)
                .tolist()
            )

            # Need at least 30 previous values
            if len(sales_values) < 30:
                continue

            # -----------------------------------
            # Lag features
            # -----------------------------------

            lag_1 = sales_values[-1]
            lag_7 = sales_values[-7]
            lag_14 = sales_values[-14]
            lag_30 = sales_values[-30]

            # -----------------------------------
            # Rolling features
            # -----------------------------------

            rolling_3_values = sales_values[-3:]
            rolling_7_values = sales_values[-7:]
            rolling_14_values = sales_values[-14:]
            rolling_30_values = sales_values[-30:]

            rolling_3 = np.mean(
                rolling_3_values
            )

            rolling_7 = np.mean(
                rolling_7_values
            )

            rolling_14 = np.mean(
                rolling_14_values
            )

            rolling_30 = np.mean(
                rolling_30_values
            )

            rolling_7_std = np.std(
                rolling_7_values
            )

            rolling_14_std = np.std(
                rolling_14_values
            )

            rolling_30_std = np.std(
                rolling_30_values
            )

            # -----------------------------------
            # Calendar features
            # -----------------------------------

            day_of_week = forecast_date.dayofweek
            month = forecast_date.month

            is_weekend = (
                1 if day_of_week >= 5 else 0
            )

            week_of_year = (
                forecast_date.isocalendar().week
            )

            # -----------------------------------
            # Create feature dictionary
            # -----------------------------------

            feature_row = {
                "day_of_week": day_of_week,
                "month": month,
                "is_weekend": is_weekend,
                "week_of_year": week_of_year,

                "lag_1": lag_1,
                "lag_7": lag_7,
                "lag_14": lag_14,
                "lag_30": lag_30,

                "rolling_3": rolling_3,
                "rolling_7": rolling_7,
                "rolling_14": rolling_14,
                "rolling_30": rolling_30,

                "rolling_7_std": rolling_7_std,
                "rolling_14_std": rolling_14_std,
                "rolling_30_std": rolling_30_std
            }

            # -----------------------------------
            # Product one-hot encoding
            # -----------------------------------

            for feature in model_features:

                if feature.startswith("product_id_"):
                    feature_row[feature] = (
                        1
                        if feature == f"product_id_{product_id}"
                        else 0
                    )

            # -----------------------------------
            # Convert to DataFrame
            # -----------------------------------

            X = pd.DataFrame([feature_row])

            # Ensure exact 40 feature order
            X = X.reindex(
                columns=model_features,
                fill_value=0
            )

            # -----------------------------------
            # Predict
            # -----------------------------------

            prediction = model.predict(X)[0]

            prediction = max(
                0,
                round(float(prediction))
            )

            # Save prediction
            daily_predictions.append({
                "product_id": product_id,
                "date": forecast_date.strftime("%Y-%m-%d"),
                "predicted_demand": prediction
            })

        # -----------------------------------
        # Add today's predictions to history
        # for recursive forecasting
        # -----------------------------------

        for prediction in daily_predictions:

            history = pd.concat(
                [
                    history,
                    pd.DataFrame([{
                        "product_id": prediction["product_id"],
                        "date": forecast_date,
                        "quantity_sold": prediction["predicted_demand"]
                    }])
                ],
                ignore_index=True
            )

        forecast_results.extend(daily_predictions)

    return {
        "status": "success",
        "forecast_days": days,
        "count": len(forecast_results),
        "forecast": forecast_results
    }