import asyncHandler from "../middleware/asyncHandler.js"
import Product from "../models/productModel.js";

// getProducts fetches all products by route GET /api/products and access is public
const getProducts = asyncHandler(async (req, res) => {
    const pageSize = 8;
    const page = Number(req.query.pageNumber) || 1;

    const keyword = req.query.keyword ? { name: { $regex: req.query.keyword, $options: 'i' } } : {};

    const count = await Product.countDocuments({ ...keyword });

    const products = await Product.find({ ...keyword }).limit(pageSize).skip(pageSize * (page - 1));
    res.send({ products, page, pages: Math.ceil(count / pageSize) });
});

// getProductsById fetches one product by route GET /api/products/:id and access is public
const getProductsById = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
        res.json(product);
    }
    else {
        res.status(404);
        throw new Error('Resource not found');
    }

});
// createProducts creates a product by route POST /api/products and access is private/admin
const createProduct = asyncHandler(async (req, res) => {
    const product = new Product({
        name: 'Sample name',
        price: 0,
        user: req.user._id,
        image: '/image/sample.jpg',
        brand: 'Sample brand',
        category: 'Sample category',
        countInStock: 0,
        numReviews: 0,
        description: 'Sample description'
    })

    const createdProducts = await product.save();
    res.status(201).json(createdProducts)
});

// updateProducts updates a product by route PUT /api/products/:id and access is private/admin
const updateProducts = asyncHandler(async (req, res) => {
    const { name, price, description, image, brand, category, countInStock } = req.body;

    const product = await Product.findById(req.params.id);

    if (product) {
        product.name = name;
        product.price = price;
        product.description = description;
        product.image = image;
        product.brand = brand;
        product.category = category;
        product.countInStock = countInStock;

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } else {
        res.status(404);
        throw new Error('Product not found')
    }
});

// Delete a product , route /api/product/delete private/admin access 
const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (product) {
        await Product.deleteOne({ _id: product._id });
        res.status(200).json({ message: 'Product deleted' });
    } else {
        res.status(404);
        throw new Error('Resource not Found');
    }
})


// Create a product review , "POST" route /api/product/delete private/admin access 
const createProductReview = asyncHandler(async (req, res) => {
    const { rating, comment } = req.body;
    console.log('Enter', req.body)


    const product = await Product.findById(req.params.id);

    if (product) {
        const alreadyReviewed = product.reviews.find(
            (review) => review.user.toString() === req.user._id.toString()
        );
        if (alreadyReviewed) {
            res.status(400);
            throw new Error('Product already reviewed')
        }

        const review = {
            name: req.user.name,
            rating: Number(rating),
            comment,
            user: req.user._id
        }

        product.reviews.push(review);

        product.numReviews = product.reviews.length;

        product.rating =
            product.reviews.reduce((acc, review) => acc + review.rating, 0) / product.reviews.length;

        await product.save();
        res.status(201).json({ message: 'Review Added' });
    } else {
        res.status(404);
        throw new Error('Resource not Found');
    }
})

const getTopProducts = asyncHandler(async(req , res) => {
    const products = await Product.find({}).sort({rating : -1}).limit(3);
    res.status(200).json(products);
})




export { getProducts, getProductsById, createProduct, updateProducts, deleteProduct, createProductReview, getTopProducts };