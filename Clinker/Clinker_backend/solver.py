import pulp
import pandas as pd
import numpy as np
import os

class ClinkerSupplyChainModel:
    def __init__(self, data):
        self.data = data
        self.prob = pulp.LpProblem("Clinker_Optimization", pulp.LpMinimize)
        self.vars = {}
        
        # Pre-process lists
        self.ius = self.data['capacity_production']['IU CODE'].unique().tolist()
        if 'demand' in self.data and not self.data['demand'].empty:
            self.gus = self.data['demand']['IUGU CODE'].unique().tolist()
            self.periods = sorted(self.data['demand']['TIME PERIOD'].unique().tolist())
        else:
            self.gus = []
            self.periods = []
        
        # Merge all nodes
        self.all_nodes = list(set(self.ius + self.gus))
        
    def build(self):
        print("Building model...")
        self._create_variables()
        self._add_constraints()
        self._set_objective()
        
    def _create_variables(self):
        # 1. Flow Variables (Quantity Shipped) & Trip Variables
        self.vars['flow'] = {}
        self.vars['trips'] = {}
        
        logistics_df = self.data['logistics']
        for _, row in logistics_df.iterrows():
            src = row['FROM IU CODE']
            dst = row['TO IUGU CODE']
            mode = row['TRANSPORT CODE']
            time = row['TIME PERIOD']
            
            key = (src, dst, mode, time)
            self.vars['flow'][key] = pulp.LpVariable(
                f"Flow_{src}_{dst}_{mode}_{time}", lowBound=0, cat='Continuous'
            )
            self.vars['trips'][key] = pulp.LpVariable(
                f"Trips_{src}_{dst}_{mode}_{time}", lowBound=0, cat='Integer'
            )

        # 2. Inventory Variables
        self.vars['inventory'] = {}
        for node in self.all_nodes:
            for t in self.periods:
                self.vars['inventory'][(node, t)] = pulp.LpVariable(
                    f"Stock_{node}_{t}", lowBound=0, cat='Continuous'
                )

        # 3. Production Variables
        self.vars['production'] = {}
        prod_cap_df = self.data['capacity_production']
        for _, row in prod_cap_df.iterrows():
            iu = row['IU CODE']
            t = row['TIME PERIOD']
            if t in self.periods:
                self.vars['production'][(iu, t)] = pulp.LpVariable(
                    f"Prod_{iu}_{t}", lowBound=0, cat='Continuous'
                )

        # 4. Unmet Demand Variables
        self.vars['unmet'] = {}
        demand_df = self.data['demand']
        for _, row in demand_df.iterrows():
            node = row['IUGU CODE']
            t = row['TIME PERIOD']
            self.vars['unmet'][(node, t)] = pulp.LpVariable(
                f"Unmet_{node}_{t}", lowBound=0, cat='Continuous'
            )

    def _add_constraints(self):
        # 1. Production Capacity
        prod_cap_df = self.data['capacity_production']
        for _, row in prod_cap_df.iterrows():
            iu = row['IU CODE']
            t = row['TIME PERIOD']
            cap = row['CAPACITY']
            if (iu, t) in self.vars['production']:
                self.prob += self.vars['production'][(iu, t)] <= cap, f"ProdCap_{iu}_{t}"

        # 2. Inventory Balance
        demand_dict = {}
        for _, row in self.data['demand'].iterrows():
            demand_dict[(row['IUGU CODE'], row['TIME PERIOD'])] = row['DEMAND']

        opening_stock = {}
        for _, row in self.data['stock_opening'].iterrows():
            opening_stock[row['IUGU CODE']] = row['OPENING STOCK']

        # Pre-group flows for efficiency
        in_flows_map = {}
        out_flows_map = {}
        for key, var in self.vars['flow'].items():
            src, dst, mode, t = key
            in_flows_map.setdefault((dst, t), []).append(var)
            out_flows_map.setdefault((src, t), []).append(var)

        for node in self.all_nodes:
            for t in self.periods:
                prev_stock = opening_stock.get(node, 0) if t == min(self.periods) else self.vars['inventory'][(node, t-1)]
                prod = self.vars['production'].get((node, t), 0)
                demand = demand_dict.get((node, t), 0)
                
                in_flow_sum = pulp.lpSum(in_flows_map.get((node, t), []))
                out_flow_sum = pulp.lpSum(out_flows_map.get((node, t), []))
                
                unmet_var = self.vars['unmet'].get((node, t), 0)
                
                self.prob += (
                    self.vars['inventory'][(node, t)] == 
                    prev_stock + prod + in_flow_sum - out_flow_sum - (demand - unmet_var)
                ), f"InvBal_{node}_{t}"

        # 3. Trip Capacity
        logistics_df = self.data['logistics']
        for _, row in logistics_df.iterrows():
            key = (row['FROM IU CODE'], row['TO IUGU CODE'], row['TRANSPORT CODE'], row['TIME PERIOD'])
            if key in self.vars['flow']:
                multiplier = row['QUANTITY MULTIPLIER']
                self.prob += (
                    self.vars['flow'][key] <= self.vars['trips'][key] * multiplier
                ), f"TripCap_{key}"

        # 4. Inventory Closing Constraints
        close_stock_df = self.data['stock_closing']
        for _, row in close_stock_df.iterrows():
            node = row['IUGU CODE']
            t = row['TIME PERIOD']
            min_s = row['MIN CLOSE STOCK']
            max_s = row['MAX CLOSE STOCK']
            
            if (node, t) in self.vars['inventory']:
                if pd.notna(min_s):
                    self.prob += self.vars['inventory'][(node, t)] >= min_s, f"MinStock_{node}_{t}"
                if pd.notna(max_s):
                    self.prob += self.vars['inventory'][(node, t)] <= max_s, f"MaxStock_{node}_{t}"

        # 5. Specialized Constraints
        if 'constraints' in self.data and not self.data['constraints'].empty:
            constraints_df = self.data['constraints']
            for _, row in constraints_df.iterrows():
                iu = row['IU CODE']
                mode = row['TRANSPORT CODE']
                dest = row['IUGU CODE']
                t = row['TIME PERIOD']
                bound = row['BOUND TYPEID']
                val = row['Value']
                
                key = (iu, dest, mode, t)
                if key in self.vars['flow']:
                    if bound == 'L':
                        self.prob += self.vars['flow'][key] <= val, f"UserConst_Max_{key}"
                    elif bound == 'G':
                        self.prob += self.vars['flow'][key] >= val, f"UserConst_Min_{key}"
                    elif bound == 'E':
                        self.prob += self.vars['flow'][key] == val, f"UserConst_Eq_{key}"

    def _set_objective(self):
        prod_cost = 0
        prod_cost_df = self.data['cost_production']
        prod_cost_dict = {}
        for _, row in prod_cost_df.iterrows():
            prod_cost_dict[(row['IU CODE'], row['TIME PERIOD'])] = row['PRODUCTION COST']
            
        for (iu, t), var in self.vars['production'].items():
            c = prod_cost_dict.get((iu, t), 0)
            prod_cost += c * var
            
        logistics_cost = 0
        logistics_df = self.data['logistics']
        for _, row in logistics_df.iterrows():
            key = (row['FROM IU CODE'], row['TO IUGU CODE'], row['TRANSPORT CODE'], row['TIME PERIOD'])
            if key in self.vars['flow']:
                unit_cost = row['FREIGHT COST'] + row['HANDLING COST']
                logistics_cost += unit_cost * self.vars['flow'][key]
                
        # Small holding cost to discourage excessive inventory
        holding_cost_per_unit = 0.1 
        inv_cost = pulp.lpSum([holding_cost_per_unit * var for var in self.vars['inventory'].values()])
            
        penalty_cost = pulp.lpSum([1000000 * var for var in self.vars['unmet'].values()])

        self.prob += prod_cost + logistics_cost + inv_cost + penalty_cost

    def solve(self):
        print("Solving...")
        # Use a solver that is available
        status = self.prob.solve(pulp.PULP_CBC_CMD(msg=0))
        print("Status:", pulp.LpStatus[status])
        return status

    def save_results(self, output_path):
        res_flow = []
        for key, var in self.vars['flow'].items():
            if var.varValue and var.varValue > 0:
                res_flow.append({
                    'From': key[0], 'To': key[1], 'Mode': key[2], 'Period': key[3],
                    'Quantity': var.varValue,
                    'Trips': self.vars['trips'][key].varValue,
                    'Status': 'Active' if key[3] == 1 else 'Pending'
                })
        
        df = pd.DataFrame(res_flow)
        df.to_excel(output_path, index=False)
        print(f"Results saved to {output_path}")
        return df

if __name__ == "__main__":
    from data_loader import DataLoader
    dataset_path = os.path.join('data', 'Dataset_Dummy_Clinker_3MPlan.xlsx')
    loader = DataLoader(dataset_path)
    data = loader.load_data()
    
    model = ClinkerSupplyChainModel(data)
    model.build()
    status = model.solve()
    if pulp.LpStatus[status] == 'Optimal':
        model.save_results(os.path.join('data', 'Optimization_Results.xlsx'))
