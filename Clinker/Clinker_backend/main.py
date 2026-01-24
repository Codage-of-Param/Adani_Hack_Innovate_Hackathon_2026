from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import pandas as pd
import os
from typing import List, Dict
from data_loader import DataLoader
from solver import ClinkerSupplyChainModel

app = FastAPI(title="Clinker Flow API")

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = "data"
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

# Mount the data directory to serve files (like the results excel)
# Note: Ensure you have 'pip install aiofiles' if you use StaticFiles with FastAPI for reliability
app.mount("/static", StaticFiles(directory=DATA_DIR), name="static")

@app.get("/")
async def root():
    return {"message": "Welcome to Clinker Flow API"}

@app.get("/files")
async def list_files():
    try:
        files = [f for f in os.listdir(DATA_DIR) if f.endswith('.xlsx')]
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/data/{filename}")
async def get_excel_data(filename: str):
    file_path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        # Load the Excel file
        df = pd.read_excel(file_path)
        # Convert to JSON-friendly format
        data = df.to_dict(orient="records")
        return {"filename": filename, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")

def run_optimization_task():
    try:
        dataset_path = os.path.join(DATA_DIR, 'Dataset_Dummy_Clinker_3MPlan.xlsx')
        output_path = os.path.join(DATA_DIR, 'Optimization_Results.xlsx')
        
        loader = DataLoader(dataset_path)
        data = loader.load_data()
        
        model = ClinkerSupplyChainModel(data)
        model.build()
        status = model.solve()
        
        from solver import pulp
        if pulp.LpStatus[status] == 'Optimal':
            model.save_results(output_path)
            print("Optimization successful")
        else:
            print(f"Optimization failed with status: {pulp.LpStatus[status]}")
    except Exception as e:
        print(f"Error in background optimization: {str(e)}")

@app.post("/optimize")
async def optimize(background_tasks: BackgroundTasks):
    dataset_path = os.path.join(DATA_DIR, 'Dataset_Dummy_Clinker_3MPlan.xlsx')
    if not os.path.exists(dataset_path):
        raise HTTPException(status_code=404, detail="Dataset file not found. Please upload Dataset_Dummy_Clinker_3MPlan.xlsx to the data folder.")
    
    background_tasks.add_task(run_optimization_task)
    return {"message": "Optimization started in background", "status": "processing"}

from pydantic import BaseModel

class AllocationSaveRequest(BaseModel):
    from_code: str
    to_code: str
    mode: str
    quantity: float
    period: int = 1
    trips: int = 1
    status: str = 'Pending'

@app.post("/save-allocation")
async def save_allocation(req: AllocationSaveRequest):
    try:
        dataset_path = os.path.join(DATA_DIR, 'Dataset_Dummy_Clinker_3MPlan.xlsx')
        output_path = os.path.join(DATA_DIR, 'Optimization_Results.xlsx')

        # 1. Update Input Excel (Add constraint for solver)
        if os.path.exists(dataset_path):
            # Load all sheets to avoid losing data
            excel_file = pd.ExcelFile(dataset_path)
            sheets = {sheet: excel_file.parse(sheet) for sheet in excel_file.sheet_names}
            
            # Update IUGUConstraint
            new_const = {
                'IU CODE': req.from_code,
                'TRANSPORT CODE': req.mode,
                'IUGU CODE': req.to_code,
                'TIME PERIOD': req.period,
                'BOUND TYPEID': 'E', # Equality constraint
                'VALUE TYPEID': 'C',
                'Value': req.quantity
            }
            
            if 'IUGUConstraint' in sheets:
                sheets['IUGUConstraint'] = pd.concat([sheets['IUGUConstraint'], pd.DataFrame([new_const])], ignore_index=True)
            else:
                sheets['IUGUConstraint'] = pd.DataFrame([new_const])
                
            # Save back all sheets
            with pd.ExcelWriter(dataset_path, engine='openpyxl') as writer:
                for sheet_name, df in sheets.items():
                    df.to_excel(writer, sheet_name=sheet_name, index=False)

        # 2. Update Output Excel (For immediate UI availability)
        if os.path.exists(output_path):
            out_df = pd.read_excel(output_path)
            new_row = {
                'From': req.from_code,
                'To': req.to_code,
                'Mode': req.mode,
                'Period': req.period,
                'Quantity': req.quantity,
                'Trips': req.trips,
                'Status': req.status
            }
            out_df = pd.concat([out_df, pd.DataFrame([new_row])], ignore_index=True)
            out_df.to_excel(output_path, index=False)

        return {"status": "success", "message": "Allocation saved to Excel files"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving allocation: {str(e)}")

class StatusUpdateRequest(BaseModel):
    from_code: str
    to_code: str
    mode: str
    period: int
    new_status: str

@app.post("/update-status")
async def update_status(req: StatusUpdateRequest):
    try:
        output_path = os.path.join(DATA_DIR, 'Optimization_Results.xlsx')
        if os.path.exists(output_path):
            df = pd.read_excel(output_path)
            # Find the row using composite key
            mask = (df['From'] == req.from_code) & (df['To'] == req.to_code) & (df['Mode'] == req.mode) & (df['Period'] == req.period)
            if mask.any():
                df.loc[mask, 'Status'] = req.new_status
                df.to_excel(output_path, index=False)
                return {"status": "success", "message": f"Status updated to {req.new_status}"}
            else:
                raise HTTPException(status_code=404, detail="Allocation not found in result file")
        else:
            raise HTTPException(status_code=404, detail="Optimization results not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
