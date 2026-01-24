import pandas as pd
import os

class DataLoader:
    def __init__(self, file_path):
        self.file_path = file_path
        self.sheet_mapping = {
            'ClinkerCapacity': 'capacity_production',
            'ClinkerDemand': 'demand',
            'LogisticsIUGU': 'logistics',
            'IUGUOpeningStock': 'stock_opening',
            'IUGUClosingStock': 'stock_closing',
            'IUGUConstraint': 'constraints',
            'ProductionCost': 'cost_production'
        }

    def load_data(self):
        if not os.path.exists(self.file_path):
            raise FileNotFoundError(f"Dataset not found at {self.file_path}")

        data = {}
        excel_file = pd.ExcelFile(self.file_path)
        
        for excel_sheet, internal_key in self.sheet_mapping.items():
            if excel_sheet in excel_file.sheet_names:
                data[internal_key] = pd.read_excel(self.file_path, sheet_name=excel_sheet)
            else:
                # Provide empty DataFrames for missing optional sheets
                print(f"Warning: Sheet {excel_sheet} not found in {self.file_path}")
                data[internal_key] = pd.DataFrame()

        # Specific column renaming if necessary to match the model logic
        # Based on the provided code:
        # demand expects 'IUGU CODE', 'TIME PERIOD', 'DEMAND'
        # capacity_production expects 'IU CODE', 'TIME PERIOD', 'CAPACITY'
        # logistics expects 'FROM IU CODE', 'TO IUGU CODE', 'TRANSPORT CODE', 'TIME PERIOD', 'QUANTITY MULTIPLIER', 'FREIGHT COST', 'HANDLING COST'
        # stock_opening expects 'IUGU CODE', 'OPENING STOCK'
        # stock_closing expects 'IUGU CODE', 'TIME PERIOD', 'MIN CLOSE STOCK', 'MAX CLOSE STOCK'
        # constraints expects 'IU CODE', 'TRANSPORT CODE', 'IUGU CODE', 'TIME PERIOD', 'BOUND TYPEID', 'Value'
        # cost_production expects 'IU CODE', 'TIME PERIOD', 'PRODUCTION COST'
        
        # We verified most of these earlier.
        
        return data

if __name__ == "__main__":
    loader = DataLoader('data/Dataset_Dummy_Clinker_3MPlan.xlsx')
    data = loader.load_data()
    for k, v in data.items():
        print(f"{k}: {v.shape}")
