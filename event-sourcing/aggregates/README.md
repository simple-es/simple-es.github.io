---
currentMenu: aggregates
---

# Aggregates

Remember that with Event Sourcing an aggregate does not contain the state as we need it in the front-end of our application.
So our basket is not going to contain a list of products that were added to it.
In stead we are going keep track of events; that a basket was picked up and products were added to it.

This doesn't mean that an aggregate doesn't contain any state at all.
We need to know which basket we're dealing with, so we keep track of its identifier.

And we need the minimum amount of state to be able to protect invariants / enforce business rules.
To show this, we need a business rule.

_The basket cannot contain more than 3 products._

In the real world we probably don't want to enforce this limit, but for the sake of this demonstration we will.
So we'll need to keep track of the number of products that were added. Without that number, we cannot determine if the limit is reached.



### Basket

Let me present the entire basket aggregate:

```php
use SimpleES\EventSourcing\Aggregate\EventTrackingCapabilities;
use SimpleES\EventSourcing\Aggregate\TracksEvents;
use SimpleES\EventSourcing\Event\AggregateHistory;

final class Basket implements TracksEvents
{
    use EventTrackingCapabilities;

    /** @var BasketId */
    private $basketId;

    /** @var int */
    private $productCount;

    /**
     * @param BasketId $basketId
     * @return Basket
     */
    public static function pickUp(BasketId $basketId)
    {
        $basket = new Basket();
        $basket->recordThat(new BasketWasPickedUp($basketId));

        return $basket;
    }

    /** @param ProductId $productId */
    public function addProduct(ProductId $productId)
    {
        $this->guardProductLimit();

        $this->recordThat(new ProductWasAddedToBasket($this->basketId, $productId));
    }

    /** @return BasketId */
    public function basketId()
    {
        return $this->basketId;
    }

    /** @param BasketWasPickedUp $event */
    private function whenBasketWasPickedUp(BasketWasPickedUp $event)
    {
        $this->basketId     = $event->basketId();
        $this->productCount = 0;
    }

    /** @param ProductWasAddedToBasket $event */
    private function whenProductWasAddedToBasket(ProductWasAddedToBasket $event)
    {
        $this->productCount++;
    }

    /** @throws BasketLimitReached */
    private function guardProductLimit()
    {
        if ($this->productCount == 3) {
            throw new \OverflowException('Limit of 3 products exceeded');
        }
    }
}
```

Now let's go over some details.


### Basket was picked up

```php
    /**
     * @param BasketId $basketId
     * @return Basket
     */
    public static function pickUp(BasketId $basketId)
    {
        $basket = new Basket();
        $basket->recordThat(new BasketWasPickedUp($basketId));

        return $basket;
    }
```

With this static factory method we instantiate the basket and record the event of picking up the basket.
`recordThat(DomainEvent $event)` is a method that will take care of recording and applying the event.

Applying the event means protecting the invariants and changing the state if needed.
It's important that this happens separately from recording the event!

Recorded events are to be stored in an event store.
When we later fetch those events and replay them to get our aggregate back, we need to apply them again _without_ getting recorded.
Otherwise they are stored again and we've effectively duplicated all the events.

The `recordThat(DomainEvent $event)` (provided by the `EventTrackingCapabilities` trait) will search for a method with the same name as the event preceded by "when".
In other words, for the event `ProductWasAddedToBasket` the method `whenProductWasAddedToBasket` is searched for.
If the method exists, it will be called with the event as argument.

```php
    /** @param BasketWasPickedUp $event */
    private function whenBasketWasPickedUp(BasketWasPickedUp $event)
    {
        $this->basketId     = $event->basketId();
        $this->productCount = 0;
    }
```

This will set the identifier of the basket and set the current product count to zero.


### Product was added to basket

```php
    /**
     * @param ProductId $productId
     */
    public function addProduct(ProductId $productId)
    {
        $this->guardProductLimit();

        $this->recordThat(new ProductWasAddedToBasket($this->basketId, $productId));
    }

    /** @throws BasketLimitReached */
    private function guardProductLimit()
    {
        if ($this->productCount == 3) {
            throw new \OverflowException('Limit of 3 products exceeded');
        }
    }
```

The first thing we do when a product is added to the basket is check the product limit.
If the basket already contains 3 products, an exception is thrown.
This way we enforce our business rule.

Next we record the event.

But how does the current product count ever reach 3?

```php
    /** @param ProductWasAddedToBasket $event */
    private function whenProductWasAddedToBasket(ProductWasAddedToBasket $event)
    {
        $this->productCount++;
    }
```

By applying the event of course! Whenever a product is added, we increase the product count.

## Internals

Coming soon...
