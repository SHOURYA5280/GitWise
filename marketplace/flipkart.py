DEMO_PRODUCTS = [
    {
        "id": 1,
        "name": "Wireless Bluetooth Headphones",
        "price": 1499,
        "marketplace": "Demo Store",
        "availability": "Available"
    },
    {
        "id": 2,
        "name": "Bluetooth Earbuds",
        "price": 999,
        "marketplace": "Demo Store",
        "availability": "Available"
    },
    {
        "id": 3,
        "name": "Wireless Gaming Headset",
        "price": 2499,
        "marketplace": "Demo Store",
        "availability": "Available"
    }
]


def search_flipkart_products(query):

    if not query:
        return []

    matching_products = [
        product for product in DEMO_PRODUCTS
        if query.lower() in product["name"].lower()
    ]

    return matching_products