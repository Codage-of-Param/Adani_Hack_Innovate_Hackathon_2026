import json
codes = json.load(open('codes.json'))
def gen_plants():
    res = "[\n"
    for i, c in enumerate(codes['FROM']):
        res += f"    {{ id: '{i+1}', name: '{c} Plant', production: 4500000, stock: 4200000, capacity: 5000000, status: 'Operational', latitude: {20 + (i % 10)}, longitude: {70 + (i % 10)}, code: '{c}' }},\n"
    res += "  ]"
    return res

def gen_units():
    res = "[\n"
    for i, c in enumerate(codes['TO']):
        res += f"    {{ id: '{i+1}', name: '{c} Unit', demand: 2000, location: 'India', priority: 'High', stock: 1800, latitude: {25 + (i % 10)}, longitude: {75 + (i % 10)}, code: '{c}' }},\n"
    res += "  ]"
    return res

with open('tsx_arrays.txt', 'w') as f:
    f.write(gen_plants() + "\n\n" + gen_units())
